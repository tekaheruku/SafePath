import { pool } from '../config/database.js';

export interface RouteWaypoint {
  lng: number;
  lat: number;
}

/**
 * All street_rating scores are on the shared severity scale
 * (1 = Minor … 4 = Critical), so a HIGHER number always means MORE dangerous.
 */
export const RISK_MIN = 1;
export const RISK_MAX = 4;
/** Midpoint of the severity scale, used when an area has no ratings. */
export const RISK_NEUTRAL = 2.5;

export interface RouteSafetyBreakdown {
  lighting: number;
  pedestrian: number;
  overall: number;
  composite: number;
  ratedSegmentCount: number;
  totalSegments: number;
}

export interface ScoredRoute {
  index: number;
  geometry: [number, number][];
  distance: number;       // metres
  duration: number;       // seconds
  riskScore: number;      // 1-4 composite; higher = more dangerous
  hasRatings: boolean;    // whether community ratings exist near this route
  breakdown: RouteSafetyBreakdown;
}

export interface ScoredRoutesResult {
  /** Routes sorted by the active mode's priority */
  routes: ScoredRoute[];
  /** Index in `routes[]` of the auto-recommended route for 'safest' mode */
  safestRecommendedIndex: number;
  /** Index in `routes[]` of the auto-recommended route for 'balanced' mode */
  balancedRecommendedIndex: number;
}

/**
 * Sample every Nth waypoint of a geometry so we don't send 1000s of DB
 * queries for a long route. For Iba's small area this is fine at every 5th.
 */
function sampleWaypoints(coords: [number, number][], maxSamples = 60): RouteWaypoint[] {
  if (coords.length === 0) return [];
  const step = Math.max(1, Math.floor(coords.length / maxSamples));
  const sampled: RouteWaypoint[] = [];
  for (let i = 0; i < coords.length; i += step) {
    sampled.push({ lng: coords[i][0], lat: coords[i][1] });
  }
  // Always include the last point
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1]?.lng !== last[0]) {
    sampled.push({ lng: last[0], lat: last[1] });
  }
  return sampled;
}

/**
 * Determine the best "safest" route index.
 *
 * Priority:
 *  1. If any rated route has a risk <= 1.5 (confirmed very safe), pick the
 *     one with the LOWEST risk score, even if it is longer.
 *  2. Otherwise, prefer unrated routes (unknown area = not confirmed dangerous).
 *     Among unrated candidates, pick the shortest.
 *  3. Fallback: pick the lowest-risk route among all rated options.
 */
function pickSafestIndex(routes: ScoredRoute[]): number {
  if (routes.length === 0) return 0;
  if (routes.length === 1) return 0;

  // Mostly "Minor" ratings — the low-risk end of the severity scale.
  const HIGHLY_SAFE_THRESHOLD = 1.5;

  // Step 1: Is there any confirmed highly-safe rated route?
  const highlySafe = routes
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.hasRatings && r.riskScore <= HIGHLY_SAFE_THRESHOLD);

  if (highlySafe.length > 0) {
    // Pick the one with the lowest risk score (longest if tie — safety wins)
    highlySafe.sort((a, b) => a.r.riskScore - b.r.riskScore ||
                               a.r.distance  - b.r.distance);
    return highlySafe[0].i;
  }

  // Step 2: No confirmed-safe route — prefer unrated (neutral) routes
  const unrated = routes
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.hasRatings);

  if (unrated.length > 0) {
    // Among unrated routes, pick the shortest
    unrated.sort((a, b) => a.r.distance - b.r.distance);
    return unrated[0].i;
  }

  // Step 3: All routes are rated but none are confirmed safe — pick the lowest-risk
  let bestIdx = 0;
  let bestScore = Infinity;
  routes.forEach((r, i) => {
    if (r.riskScore < bestScore ||
        (r.riskScore === bestScore && r.distance < routes[bestIdx].distance)) {
      bestScore = r.riskScore;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/**
 * Determine the best "shortest" route index.
 *
 * Simply picks the route with the smallest distance, regardless of safety.
 * The user has explicitly opted for speed/convenience over safety.
 */
function pickShortestIndex(routes: ScoredRoute[]): number {
  if (routes.length === 0) return 0;
  let shortestIdx = 0;
  routes.forEach((r, i) => {
    if (r.distance < routes[shortestIdx].distance) shortestIdx = i;
  });
  return shortestIdx;
}

export class RouteSafetyService {
  /**
   * Score an array of OSRM routes (geometry in [lng,lat] pairs) by querying
   * nearby street_ratings from PostGIS and averaging their severity scores.
   *
   * Returns routes sorted by risk score ascending (safest first), plus
   * recommended indexes for 'safest' and 'balanced' modes.
   *
   * @param routes        Array of { index, geometry, distance, duration }
   * @param radiusMeters  Search radius around each sampled waypoint
   */
  static async scoreRoutes(
    routes: { index: number; geometry: [number, number][]; distance: number; duration: number }[],
    radiusMeters: number = parseInt(process.env.ROUTE_SAFETY_RADIUS_METERS || '150')
  ): Promise<ScoredRoutesResult> {
    const scored: ScoredRoute[] = [];

    for (const route of routes) {
      const waypoints = sampleWaypoints(route.geometry);
      const totalSegments = waypoints.length;

      if (totalSegments === 0) {
        scored.push({
          ...route,
          riskScore: RISK_NEUTRAL,
          hasRatings: false,
          breakdown: {
            lighting: RISK_NEUTRAL,
            pedestrian: RISK_NEUTRAL,
            overall: RISK_NEUTRAL,
            composite: RISK_NEUTRAL,
            ratedSegmentCount: 0,
            totalSegments: 0,
          },
        });
        continue;
      }

      // Build a VALUES list for a single efficient query instead of N round-trips
      const valuePlaceholders: string[] = [];
      const queryParams: number[] = [radiusMeters];
      let paramIdx = 2;

      for (const wp of waypoints) {
        valuePlaceholders.push(`($${paramIdx}::double precision, $${paramIdx + 1}::double precision)`);
        queryParams.push(wp.lng, wp.lat);
        paramIdx += 2;
      }

      const query = `
        SELECT
          AVG(sr.lighting_score)           AS avg_lighting,
          AVG(sr.pedestrian_safety_score)  AS avg_pedestrian,
          AVG(sr.overall_safety_score)     AS avg_overall,
          COUNT(DISTINCT sr.id)            AS rating_count
        FROM street_ratings sr
        JOIN (VALUES ${valuePlaceholders.join(', ')}) AS pts(lng, lat)
          ON ST_DWithin(
               sr.location::geography,
               ST_SetSRID(ST_MakePoint(pts.lng, pts.lat), 4326)::geography,
               $1
             )
      `;

      let avgLighting = RISK_NEUTRAL;
      let avgPedestrian = RISK_NEUTRAL;
      let avgOverall = RISK_NEUTRAL;
      let ratedSegmentCount = 0;
      let hasRatings = false;

      try {
        const result = await pool.query(query, queryParams);
        const row = result.rows[0];

        if (row && row.rating_count && parseInt(row.rating_count) > 0) {
          ratedSegmentCount = parseInt(row.rating_count);
          hasRatings = true;
          avgLighting    = parseFloat(row.avg_lighting)    || RISK_NEUTRAL;
          avgPedestrian  = parseFloat(row.avg_pedestrian)  || RISK_NEUTRAL;
          avgOverall     = parseFloat(row.avg_overall)     || RISK_NEUTRAL;
        }
      } catch (err) {
        console.error(`[RouteSafetyService] Query error for route ${route.index}:`, err);
        // Fall through with neutral defaults
      }

      // Composite risk: weighted average (pedestrian hazards weighted highest
      // for walking). Higher = more dangerous.
      const composite = (
        avgLighting   * 0.25 +
        avgPedestrian * 0.50 +
        avgOverall    * 0.25
      );

      scored.push({
        index: route.index,
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        riskScore: Math.round(composite * 100) / 100,
        hasRatings,
        breakdown: {
          lighting:           Math.round(avgLighting   * 100) / 100,
          pedestrian:         Math.round(avgPedestrian * 100) / 100,
          overall:            Math.round(avgOverall    * 100) / 100,
          composite:          Math.round(composite    * 100) / 100,
          ratedSegmentCount,
          totalSegments,
        },
      });
    }

    // Sort by risk score ascending (safest first)
    scored.sort((a, b) => a.riskScore - b.riskScore);

    const safestRecommendedIndex   = pickSafestIndex(scored);
    const balancedRecommendedIndex = pickShortestIndex(scored);

    return {
      routes: scored,
      safestRecommendedIndex,
      balancedRecommendedIndex,
    };
  }
}
