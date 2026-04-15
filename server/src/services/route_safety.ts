import { pool } from '../config/database.js';

export interface RouteWaypoint {
  lng: number;
  lat: number;
}

export interface RouteSafetyBreakdown {
  lighting: number;
  pedestrian: number;
  driver: number;
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
  safetyScore: number;    // 0-5 composite
  breakdown: RouteSafetyBreakdown;
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

export class RouteSafetyService {
  /**
   * Score an array of OSRM routes (geometry in [lng,lat] pairs) by querying
   * nearby street_ratings from PostGIS and averaging the four safety scores.
   *
   * @param routes  Array of { index, geometry, distance, duration }
   * @param radiusMeters  Search radius around each sampled waypoint (env-configurable)
   */
  static async scoreRoutes(
    routes: { index: number; geometry: [number, number][]; distance: number; duration: number }[],
    radiusMeters: number = parseInt(process.env.ROUTE_SAFETY_RADIUS_METERS || '150')
  ): Promise<ScoredRoute[]> {
    const results: ScoredRoute[] = [];

    for (const route of routes) {
      const waypoints = sampleWaypoints(route.geometry);
      const totalSegments = waypoints.length;

      if (totalSegments === 0) {
        results.push({
          ...route,
          safetyScore: 3.0,
          breakdown: {
            lighting: 3.0,
            pedestrian: 3.0,
            driver: 3.0,
            overall: 3.0,
            composite: 3.0,
            ratedSegmentCount: 0,
            totalSegments: 0,
          },
        });
        continue;
      }

      // Build a VALUES list for a single efficient query instead of N round-trips
      // e.g.  (VALUES ($1,$2), ($3,$4), ...) AS pts(lng, lat)
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
          AVG(sr.driver_safety_score)      AS avg_driver,
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

      let avgLighting = 3.0;
      let avgPedestrian = 3.0;
      let avgDriver = 3.0;
      let avgOverall = 3.0;
      let ratedSegmentCount = 0;

      try {
        const result = await pool.query(query, queryParams);
        const row = result.rows[0];

        if (row && row.rating_count && parseInt(row.rating_count) > 0) {
          ratedSegmentCount = parseInt(row.rating_count);
          avgLighting    = parseFloat(row.avg_lighting)    || 3.0;
          avgPedestrian  = parseFloat(row.avg_pedestrian)  || 3.0;
          avgDriver      = parseFloat(row.avg_driver)      || 3.0;
          avgOverall     = parseFloat(row.avg_overall)     || 3.0;
        }
      } catch (err) {
        console.error(`[RouteSafetyService] Query error for route ${route.index}:`, err);
        // Fall through with neutral defaults
      }

      // Composite: weighted average (pedestrian safety weighted highest for walking)
      const composite = (
        avgLighting   * 0.20 +
        avgPedestrian * 0.45 +
        avgDriver     * 0.15 +
        avgOverall    * 0.20
      );

      results.push({
        index: route.index,
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        safetyScore: Math.round(composite * 100) / 100,
        breakdown: {
          lighting:           Math.round(avgLighting   * 100) / 100,
          pedestrian:         Math.round(avgPedestrian * 100) / 100,
          driver:             Math.round(avgDriver     * 100) / 100,
          overall:            Math.round(avgOverall    * 100) / 100,
          composite:          Math.round(composite    * 100) / 100,
          ratedSegmentCount,
          totalSegments,
        },
      });
    }

    // Sort by safety score descending (safest first)
    results.sort((a, b) => b.safetyScore - a.safetyScore);

    return results;
  }
}
