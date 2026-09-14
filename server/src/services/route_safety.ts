import { pool } from '../config/database.js';
import { getConfirmedReportsFilter } from './report.js';

export interface RouteWaypoint {
  lng: number;
  lat: number;
}

export type RouteProfile = 'foot' | 'bike' | 'car';

/**
 * All street_rating scores and severity_levels.level share the same severity
 * scale (1 = Minor … 4 = Critical), so a HIGHER number always means MORE
 * dangerous.
 */
export const RISK_MIN = 1;
export const RISK_MAX = 4;
/** Midpoint of the severity scale, used when an area has no ratings. */
export const RISK_NEUTRAL = 2.5;

const num = (key: string, fallback: number): number => {
  const parsed = parseFloat(process.env[key] ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Tuning knobs for the safety model. These are reasoned starting points rather
 * than values calibrated against real data, so every one is env-overridable to
 * allow tuning without a redeploy.
 */
export const ROUTE_SAFETY_CONSTANTS = {
  /** Ratings further than this from the route are ignored outright. */
  RATING_RADIUS_M: num('ROUTE_SAFETY_RATING_RADIUS_M', 200),
  /** Half-weight distance for ratings: 1.0 on the line, 0.5 here, ~0.12 at the cutoff. */
  RATING_DECAY_D0_M: num('ROUTE_SAFETY_RATING_DECAY_D0_M', 75),
  /** An incident deters over a wider area than a rating describes. */
  REPORT_RADIUS_M: num('ROUTE_SAFETY_REPORT_RADIUS_M', 250),
  REPORT_DECAY_D0_M: num('ROUTE_SAFETY_REPORT_DECAY_D0_M', 100),
  /**
   * How far back a confirmed incident report still counts as a live hazard.
   * A rolling window ("now minus N days"), not a calendar-day cutoff, so it
   * needs no timezone handling and never has an artificial boundary at
   * midnight — an incident from 71 hours ago counts the same as one from 1
   * hour ago; at 73 hours it drops out entirely. Full weight inside the
   * window, none outside — deliberately no extra recency decay on top, to
   * keep the rule easy to reason about ("did something happen here in the
   * last 3 days, yes or no").
   */
  INCIDENT_WINDOW_DAYS: num('ROUTE_SAFETY_INCIDENT_WINDOW_DAYS', 3),
  /** Prior strength for rating confidence — 3 full-weight ratings give 50% confidence. */
  K_RATINGS: num('ROUTE_SAFETY_K_RATINGS', 3.0),
  /** Severity-weighted incidents per km at which the incident penalty saturates. */
  P_SAT: num('ROUTE_SAFETY_P_SAT', 6.0),
  /**
   * Detour aversion. LAMBDA and BETA both penalise length, so they compound:
   * the break-even risk improvement for a detour of `e` is roughly
   * `riskNorm * BETA * e + LAMBDA * e` on the normalised scale. At 0.35/0.5 a
   * 30% detour demanded a ~0.47 point improvement on the 1-4 scale, which is far
   * too conservative for a mode whose whole promise is "safer, even if longer" —
   * it almost never diverged from the shortest route. At 0.18/0.25 the same
   * detour needs ~0.23 points, and the hard MAX_DETOUR cap still bounds how far
   * it can ever wander.
   */
  LAMBDA: num('ROUTE_SAFETY_LAMBDA', 0.18),
  /** Extra total-exposure carried by a longer route, damped below strictly linear. */
  BETA: num('ROUTE_SAFETY_BETA', 0.25),
  /** The safest route may be at most this multiple of the shortest route's distance. */
  MAX_DETOUR: num('ROUTE_SAFETY_MAX_DETOUR', 1.5),
  /** Costs within this are treated as tied. */
  COST_EPSILON: num('ROUTE_SAFETY_COST_EPSILON', 0.02),
  /** Below this confidence with no incidents, we admit we have no evidence. */
  MIN_CONFIDENCE_FOR_EVIDENCE: num('ROUTE_SAFETY_MIN_CONFIDENCE', 0.15),
  /** Arc-length spacing when resampling a route geometry. */
  SAMPLE_STEP_M: num('ROUTE_SAFETY_SAMPLE_STEP_M', 25),
  MAX_SAMPLES: num('ROUTE_SAFETY_MAX_SAMPLES', 250),
  /** Bounds worst-case query latency rather than hanging the HTTP request. */
  STATEMENT_TIMEOUT_MS: num('ROUTE_SAFETY_STATEMENT_TIMEOUT_MS', 4000),
};

/**
 * Which evidence each travel mode's safety score is built from, kept as a
 * clean either/or rather than a blend of both:
 *
 * - Walking and cycling use community street ratings (lighting, pedestrian
 *   safety) — ratingWeight: 1, reportWeight: 0. A crash report is mostly a
 *   vehicle-to-vehicle event; it says little about whether a sidewalk is
 *   safe to walk, so it's left out entirely rather than diluting the rating
 *   signal.
 * - Driving uses confirmed incident reports (crashes, road blockages,
 *   hazards, congestion) from the last few days — ratingWeight: 0,
 *   reportWeight: 1. A recent incident is exactly the kind of thing a driver
 *   needs to route around; lighting/pedestrian ratings say little about
 *   whether a road is currently passable, so driving ignores them and a
 *   route with no incidents nearby simply scores neutral.
 *
 * `lighting`/`pedestrian`/`driver` are only the per-category weights used
 * when ratingWeight > 0, i.e. they matter for foot/bike but are unused by car.
 */
const PROFILE_WEIGHTS: Record<RouteProfile, {
  lighting: number;
  pedestrian: number;
  driver: number;
  ratingWeight: number;
  reportWeight: number;
}> = {
  foot: { lighting: 0.35, pedestrian: 0.50, driver: 0.15, ratingWeight: 1.00, reportWeight: 0 },
  bike: { lighting: 0.30, pedestrian: 0.35, driver: 0.35, ratingWeight: 1.00, reportWeight: 0 },
  car:  { lighting: 0.15, pedestrian: 0.15, driver: 0.70, ratingWeight: 0,    reportWeight: 1.00 },
};

export interface RouteSafetyBreakdown {
  lighting: number;
  pedestrian: number;
  overall: number;
  composite: number;
  ratedSegmentCount: number;
  totalSegments: number;
  /** 0-1. How much evidence backs this score; drives shrinkage toward neutral. */
  confidence: number;
  ratingCount: number;
  incidentCount: number;
  /** Severity-weighted incidents per km along the route. */
  incidentPressure: number;
  /** distance / shortest candidate distance. 1.0 means this IS the shortest. */
  detourRatio: number;
  /** Combined selection cost; lower is better. */
  cost: number;
}

export interface ScoredRoute {
  index: number;
  geometry: [number, number][];
  distance: number;       // metres
  duration: number;       // seconds
  riskScore: number;      // 1-4 composite; higher = more dangerous
  hasRatings: boolean;    // whether we have enough evidence to trust the score
  scoreStatus: 'ok' | 'unavailable';
  /** Short human explanations of why this route scored as it did. */
  reasons: string[];
  breakdown: RouteSafetyBreakdown;
}

export interface ScoredRoutesResult {
  /** Routes sorted by selection cost ascending (safest-per-detour first) */
  routes: ScoredRoute[];
  /**
   * Index in `routes[]` of the auto-recommended route for 'safest' mode, or
   * null when safety data could not be loaded — callers must not fall back to
   * the shortest route and call it "safest".
   */
  safestRecommendedIndex: number | null;
  /** Index in `routes[]` of the auto-recommended route for 'balanced' mode */
  balancedRecommendedIndex: number;
  degraded: boolean;
  degradedReason: string | null;
}

interface RouteInput {
  index: number;
  geometry: [number, number][];
  distance: number;
  duration: number;
}

interface HazardRow {
  route_idx: number;
  length_m: number;
  rating_mass: number;
  mean_severity: number | null;
  avg_lighting: number | null;
  avg_pedestrian: number | null;
  avg_overall: number | null;
  rating_count: number;
  report_severity_mass: number;
  report_count: number;
}

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

function haversineMeters(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Resample a route at a fixed arc-length interval.
 *
 * Stepping by coordinate index (the previous approach) oversamples curves and
 * intersections, where OSRM emits many vertices per metre, and undersamples long
 * straights — so a bend in the road dominated the score. Stepping by ground
 * distance makes every metre of road count the same.
 */
export function resampleByDistance(
  coords: [number, number][],
  stepMeters: number = ROUTE_SAFETY_CONSTANTS.SAMPLE_STEP_M,
  maxSamples: number = ROUTE_SAFETY_CONSTANTS.MAX_SAMPLES
): { samples: RouteWaypoint[]; lengthMeters: number } {
  if (coords.length === 0) return { samples: [], lengthMeters: 0 };
  if (coords.length === 1) {
    return { samples: [{ lng: coords[0][0], lat: coords[0][1] }], lengthMeters: 0 };
  }

  let lengthMeters = 0;
  for (let i = 1; i < coords.length; i++) {
    lengthMeters += haversineMeters(coords[i - 1], coords[i]);
  }

  // Grow the step rather than the sample count on very long routes, so the
  // payload stays bounded.
  const step = Math.max(stepMeters, lengthMeters / maxSamples);

  const samples: RouteWaypoint[] = [{ lng: coords[0][0], lat: coords[0][1] }];
  let carried = 0;

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const segLen = haversineMeters(prev, curr);
    if (segLen === 0) continue;

    let offset = step - carried;
    while (offset <= segLen) {
      const t = offset / segLen;
      samples.push({
        lng: prev[0] + (curr[0] - prev[0]) * t,
        lat: prev[1] + (curr[1] - prev[1]) * t,
      });
      offset += step;
    }
    carried = segLen - (offset - step);
  }

  const last = coords[coords.length - 1];
  const tail = samples[samples.length - 1];
  if (!tail || tail.lng !== last[0] || tail.lat !== last[1]) {
    samples.push({ lng: last[0], lat: last[1] });
  }

  // ST_MakeLine needs at least two distinct points.
  if (samples.length < 2) {
    return {
      samples: [
        { lng: coords[0][0], lat: coords[0][1] },
        { lng: last[0], lat: last[1] },
      ],
      lengthMeters,
    };
  }

  return { samples, lengthMeters };
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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;
const toNum = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

export class RouteSafetyService {
  /**
   * Score an array of OSRM routes (geometry in [lng,lat] pairs) against nearby
   * community street ratings and confirmed incident reports from the last
   * INCIDENT_WINDOW_DAYS days — walking/cycling weigh ratings only, driving
   * weighs incidents only (see PROFILE_WEIGHTS).
   *
   * Returns routes sorted by selection cost ascending, plus recommended indexes
   * for 'safest' and 'balanced' modes.
   */
  static async scoreRoutes(
    routes: RouteInput[],
    profile: RouteProfile = 'foot'
  ): Promise<ScoredRoutesResult> {
    const weights = PROFILE_WEIGHTS[profile] ?? PROFILE_WEIGHTS.foot;

    const prepared = routes.map((route) => {
      const { samples, lengthMeters } = resampleByDistance(route.geometry);
      return { route, samples, lengthMeters };
    });

    let rowsByIdx = new Map<number, HazardRow>();
    let degraded = false;
    let degradedReason: string | null = null;

    try {
      rowsByIdx = await this.queryHazards(prepared, weights);
    } catch (err: any) {
      // Deliberately NOT swallowed into a neutral score. Silently returning 2.5
      // made a database failure indistinguishable from "no data nearby", which
      // then handed the user the shortest route labelled as the safest one.
      console.error('[RouteSafetyService] Hazard query failed:', err?.message ?? err);
      degraded = true;
      degradedReason = 'SAFETY_DATA_UNAVAILABLE';
    }

    const minDistance = routes.reduce(
      (min, r) => (r.distance > 0 && r.distance < min ? r.distance : min),
      Infinity
    );

    const scored: ScoredRoute[] = prepared.map(({ route, samples, lengthMeters }) => {
      const row = rowsByIdx.get(route.index);
      const detourRatio =
        Number.isFinite(minDistance) && minDistance > 0 ? route.distance / minDistance : 1;

      if (degraded || !row) {
        return {
          index: route.index,
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration,
          riskScore: RISK_NEUTRAL,
          hasRatings: false,
          scoreStatus: degraded ? 'unavailable' : 'ok',
          reasons: degraded
            ? ['Safety data unavailable']
            : ['No community data near this route'],
          breakdown: {
            lighting: RISK_NEUTRAL,
            pedestrian: RISK_NEUTRAL,
            overall: RISK_NEUTRAL,
            composite: RISK_NEUTRAL,
            ratedSegmentCount: 0,
            totalSegments: samples.length,
            confidence: 0,
            ratingCount: 0,
            incidentCount: 0,
            incidentPressure: 0,
            detourRatio: round2(detourRatio),
            cost: 0,
          },
        };
      }

      const {
        hazard, confidence, ratingCount, incidentCount, incidentPressure,
        lighting, pedestrian, overall,
      } = this.computeHazard(row, weights, lengthMeters);

      const riskNorm = (hazard - RISK_MIN) / (RISK_MAX - RISK_MIN);
      const excess = Math.max(0, detourRatio - 1);
      const cost =
        riskNorm * (1 + ROUTE_SAFETY_CONSTANTS.BETA * excess) +
        ROUTE_SAFETY_CONSTANTS.LAMBDA * excess;

      // "Do we have evidence backing this score" is profile-aware: ratings
      // aren't evidence of anything for car (its score ignores them), and
      // incidents aren't evidence of anything for foot/bike (same).
      const hasRatings =
        (weights.ratingWeight > 0 && confidence >= ROUTE_SAFETY_CONSTANTS.MIN_CONFIDENCE_FOR_EVIDENCE) ||
        (weights.reportWeight > 0 && incidentCount > 0);

      return {
        index: route.index,
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        riskScore: round2(hazard),
        hasRatings,
        scoreStatus: 'ok' as const,
        reasons: this.buildReasons({
          hazard, confidence, ratingCount, incidentCount, detourRatio,
          usesRatings: weights.ratingWeight > 0,
          usesIncidents: weights.reportWeight > 0,
        }),
        breakdown: {
          lighting: round2(lighting),
          pedestrian: round2(pedestrian),
          overall: round2(overall),
          composite: round2(hazard),
          ratedSegmentCount: ratingCount,
          totalSegments: samples.length,
          confidence: round2(confidence),
          ratingCount,
          incidentCount,
          incidentPressure: round2(incidentPressure),
          detourRatio: round2(detourRatio),
          cost: round2(cost),
        },
      };
    });

    // Sort by selection cost so card order matches the panel's "safest first"
    // claim. Ties fall back to evidence, then length.
    scored.sort((a, b) => {
      const d = a.breakdown.cost - b.breakdown.cost;
      if (Math.abs(d) > ROUTE_SAFETY_CONSTANTS.COST_EPSILON) return d;
      const conf = b.breakdown.confidence - a.breakdown.confidence;
      if (conf !== 0) return conf;
      return a.distance - b.distance;
    });

    return {
      routes: scored,
      safestRecommendedIndex: degraded ? null : this.selectSafestIndex(scored),
      balancedRecommendedIndex: pickShortestIndex(scored),
      degraded,
      degradedReason,
    };
  }

  /**
   * Blend the two evidence channels into a single 1-4 hazard score, weighted
   * by which ones this travel profile actually uses (see PROFILE_WEIGHTS —
   * foot/bike use ratings only, car uses incidents only, never both).
   *
   * Channel A (ratings) is shrunk toward the neutral prior by confidence, so a
   * route with plenty of good ratings beats an unrated one while a route with a
   * single rating barely moves off neutral. Channel B (incidents) is additive
   * only, relative to that same neutral prior: an absence of reports is not
   * evidence of safety, so it can never pull the score below neutral, only
   * push it above.
   */
  private static computeHazard(
    row: HazardRow,
    weights: typeof PROFILE_WEIGHTS[RouteProfile],
    lengthMeters: number
  ) {
    const ratingMass = toNum(row.rating_mass);
    const ratingCount = Math.round(toNum(row.rating_count));
    const meanSeverity = row.mean_severity === null ? RISK_NEUTRAL : toNum(row.mean_severity, RISK_NEUTRAL);

    const confidence = ratingMass / (ratingMass + ROUTE_SAFETY_CONSTANTS.K_RATINGS);
    const channelA = RISK_NEUTRAL + confidence * (meanSeverity - RISK_NEUTRAL);

    const incidentCount = Math.round(toNum(row.report_count));
    const severityMass = toNum(row.report_severity_mass);
    const km = Math.max(0.05, (lengthMeters || toNum(row.length_m)) / 1000);
    const incidentPressure = severityMass / km;
    const channelB =
      Math.min(1, incidentPressure / ROUTE_SAFETY_CONSTANTS.P_SAT) * (RISK_MAX - RISK_NEUTRAL);

    const hazard = clamp(
      RISK_NEUTRAL +
        weights.ratingWeight * (channelA - RISK_NEUTRAL) +
        weights.reportWeight * channelB,
      RISK_MIN, RISK_MAX
    );

    return {
      hazard,
      confidence,
      ratingCount,
      incidentCount,
      incidentPressure,
      lighting: row.avg_lighting === null ? RISK_NEUTRAL : toNum(row.avg_lighting, RISK_NEUTRAL),
      pedestrian: row.avg_pedestrian === null ? RISK_NEUTRAL : toNum(row.avg_pedestrian, RISK_NEUTRAL),
      overall: row.avg_overall === null ? RISK_NEUTRAL : toNum(row.avg_overall, RISK_NEUTRAL),
    };
  }

  /**
   * Lowest-cost route that stays within the detour cap. If every candidate
   * exceeds the cap (only possible when the shortest distance is degenerate),
   * fall back to the global minimum so a valid index is always returned.
   */
  private static selectSafestIndex(routes: ScoredRoute[]): number {
    if (routes.length === 0) return 0;

    const eligible = routes
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.breakdown.detourRatio <= ROUTE_SAFETY_CONSTANTS.MAX_DETOUR);

    const pool_ = eligible.length > 0 ? eligible : routes.map((r, i) => ({ r, i }));

    let best = pool_[0];
    for (const cand of pool_) {
      const d = cand.r.breakdown.cost - best.r.breakdown.cost;
      if (d < -ROUTE_SAFETY_CONSTANTS.COST_EPSILON) {
        best = cand;
      } else if (Math.abs(d) <= ROUTE_SAFETY_CONSTANTS.COST_EPSILON) {
        if (cand.r.breakdown.confidence > best.r.breakdown.confidence) best = cand;
        else if (
          cand.r.breakdown.confidence === best.r.breakdown.confidence &&
          cand.r.distance < best.r.distance
        ) best = cand;
      }
    }
    return best.i;
  }

  private static buildReasons(o: {
    hazard: number; confidence: number; ratingCount: number;
    incidentCount: number; detourRatio: number;
    /** Only mention a channel this profile's score actually uses — see PROFILE_WEIGHTS. */
    usesRatings: boolean; usesIncidents: boolean;
  }): string[] {
    const reasons: string[] = [];

    if (o.usesRatings) {
      if (o.ratingCount > 0) {
        const tone = o.hazard <= 1.8 ? 'mostly safe' : o.hazard <= 2.6 ? 'mixed' : 'poorly rated';
        reasons.push(`${o.ratingCount} nearby rating${o.ratingCount === 1 ? '' : 's'}, ${tone}`);
      } else {
        reasons.push('No community ratings nearby');
      }
    }

    if (o.usesIncidents) {
      if (o.incidentCount > 0) {
        reasons.push(`${o.incidentCount} incident${o.incidentCount === 1 ? '' : 's'} reported in the last 3 days`);
      } else {
        reasons.push('No incidents reported in the last 3 days');
      }
    }

    if (o.detourRatio > 1.02) {
      reasons.push(`${Math.round((o.detourRatio - 1) * 100)}% longer than the shortest route`);
    }

    if (o.usesRatings && o.confidence < ROUTE_SAFETY_CONSTANTS.MIN_CONFIDENCE_FOR_EVIDENCE) {
      reasons.push('Limited data — treated as neutral');
    }

    return reasons;
  }

  /**
   * Score every route in a single set-based query.
   *
   * Each route's sampled polyline is rebuilt once with ST_MakeLine and each
   * rating/report is measured against that line exactly once. The previous
   * implementation joined ratings against ~61 individual waypoints, so a rating
   * near a dense cluster of vertices was counted many times in the average while
   * COUNT(DISTINCT) counted it once — the score was silently weighted by OSRM's
   * vertex spacing.
   */
  private static async queryHazards(
    prepared: { route: RouteInput; samples: RouteWaypoint[]; lengthMeters: number }[],
    weights: typeof PROFILE_WEIGHTS[RouteProfile]
  ): Promise<Map<number, HazardRow>> {
    const routeIdx: number[] = [];
    const seq: number[] = [];
    const lngs: number[] = [];
    const lats: number[] = [];
    const metaIdx: number[] = [];
    const metaLen: number[] = [];

    for (const { route, samples, lengthMeters } of prepared) {
      metaIdx.push(route.index);
      metaLen.push(lengthMeters || route.distance || 0);
      samples.forEach((s, i) => {
        routeIdx.push(route.index);
        seq.push(i);
        lngs.push(s.lng);
        lats.push(s.lat);
      });
    }

    const C = ROUTE_SAFETY_CONSTANTS;

    const sql = `
      WITH samples AS (
        SELECT * FROM unnest($1::int[], $2::int[], $3::float8[], $4::float8[])
          AS t(route_idx, seq, lng, lat)
      ),
      route_line AS (
        SELECT route_idx,
               ST_MakeLine(ST_SetSRID(ST_MakePoint(lng, lat), 4326) ORDER BY seq)::geography AS line
        FROM samples
        GROUP BY route_idx
        HAVING COUNT(*) >= 2
      ),
      route_meta AS (
        SELECT * FROM unnest($5::int[], $6::float8[]) AS t(route_idx, length_m)
      ),
      rating_hits AS (
        SELECT
          rl.route_idx,
          -- Inverse-square decay: full weight on the line, half at $8 metres.
          1.0 / (1.0 + POWER(ST_Distance(sr.location, rl.line) / $8::float8, 2)) AS w,
          -- Weighted over whichever categories the rater actually filled in, then
          -- renormalised. overall_safety_score is only a FALLBACK, never an extra
          -- addend, because it is itself derived from these same columns.
          COALESCE(
            (
                $9::float8  * COALESCE(sr.lighting_score, 0)
              + $10::float8 * COALESCE(sr.pedestrian_safety_score, 0)
              + $11::float8 * COALESCE(sr.driver_safety_score, 0)
            ) / NULLIF(
                $9::float8  * (sr.lighting_score          IS NOT NULL)::int
              + $10::float8 * (sr.pedestrian_safety_score IS NOT NULL)::int
              + $11::float8 * (sr.driver_safety_score     IS NOT NULL)::int, 0),
            sr.overall_safety_score::float8
          ) AS severity,
          sr.lighting_score,
          sr.pedestrian_safety_score,
          sr.overall_safety_score
        FROM route_line rl
        JOIN street_ratings sr
          ON sr.location IS NOT NULL
         AND ST_DWithin(sr.location, rl.line, $7::float8)
      ),
      rating_agg AS (
        SELECT
          route_idx,
          SUM(w)                                             AS rating_mass,
          SUM(w * severity) / NULLIF(SUM(w), 0)              AS mean_severity,
          SUM(w * lighting_score) FILTER (WHERE lighting_score IS NOT NULL)
            / NULLIF(SUM(w) FILTER (WHERE lighting_score IS NOT NULL), 0)          AS avg_lighting,
          SUM(w * pedestrian_safety_score) FILTER (WHERE pedestrian_safety_score IS NOT NULL)
            / NULLIF(SUM(w) FILTER (WHERE pedestrian_safety_score IS NOT NULL), 0) AS avg_pedestrian,
          SUM(w * overall_safety_score) / NULLIF(SUM(w), 0)  AS avg_overall,
          COUNT(*)                                           AS rating_count
        FROM rating_hits
        GROUP BY route_idx
      ),
      report_hits AS (
        SELECT
          rl.route_idx,
          1.0 / (1.0 + POWER(ST_Distance(rep.location, rl.line) / $13::float8, 2)) AS w,
          COALESCE(sl.level, 1)::float8 AS level
        FROM route_line rl
        JOIN reports rep
          ON rep.location IS NOT NULL
         AND ST_DWithin(rep.location, rl.line, $12::float8)
        LEFT JOIN severity_levels sl ON rep.severity_level_id = sl.id
        WHERE ${getConfirmedReportsFilter('rep')}
          -- Rolling window: incidents are live hazards, not permanent history.
          AND rep.created_at >= NOW() - ($14::text || ' days')::interval
      ),
      report_agg AS (
        SELECT route_idx,
               SUM(w * level) AS report_severity_mass,
               COUNT(*)       AS report_count
        FROM report_hits
        GROUP BY route_idx
      )
      SELECT
        rm.route_idx,
        rm.length_m,
        COALESCE(ra.rating_mass, 0)          AS rating_mass,
        ra.mean_severity,
        ra.avg_lighting,
        ra.avg_pedestrian,
        ra.avg_overall,
        COALESCE(ra.rating_count, 0)         AS rating_count,
        COALESCE(rp.report_severity_mass, 0) AS report_severity_mass,
        COALESCE(rp.report_count, 0)         AS report_count
      FROM route_meta rm
      LEFT JOIN rating_agg ra ON ra.route_idx = rm.route_idx
      LEFT JOIN report_agg rp ON rp.route_idx = rm.route_idx
      ORDER BY rm.route_idx
    `;

    const params = [
      routeIdx, seq, lngs, lats,
      metaIdx, metaLen,
      C.RATING_RADIUS_M, C.RATING_DECAY_D0_M,
      weights.lighting, weights.pedestrian, weights.driver,
      C.REPORT_RADIUS_M, C.REPORT_DECAY_D0_M,
      C.INCIDENT_WINDOW_DAYS,
    ];

    const client = await pool.connect();
    try {
      // SET LOCAL only takes effect inside a transaction, and reverts on COMMIT —
      // which matters because this client goes back into a shared pool.
      await client.query('BEGIN');
      await client.query(`SET LOCAL statement_timeout = ${Math.round(C.STATEMENT_TIMEOUT_MS)}`);
      const result = await client.query(sql, params);
      await client.query('COMMIT');

      const map = new Map<number, HazardRow>();
      for (const row of result.rows) {
        map.set(Number(row.route_idx), row as HazardRow);
      }
      return map;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* connection may already be broken */ });
      throw err;
    } finally {
      client.release();
    }
  }
}
