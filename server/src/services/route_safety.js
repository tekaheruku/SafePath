import { pool } from '../config/database.js';

function sampleWaypoints(coords, maxSamples = 60) {
    if (coords.length === 0) return [];
    const step = Math.max(1, Math.floor(coords.length / maxSamples));
    const sampled = [];
    for (let i = 0; i < coords.length; i += step) {
        sampled.push({ lng: coords[i][0], lat: coords[i][1] });
    }
    const last = coords[coords.length - 1];
    if (sampled[sampled.length - 1]?.lng !== last[0]) {
        sampled.push({ lng: last[0], lat: last[1] });
    }
    return sampled;
}

/**
 * Safest route:
 *  1. If any rated route scores >= 4.0, pick the highest-rated (safety wins over distance).
 *  2. Otherwise prefer unrated routes (unknown = neutral, not confirmed dangerous).
 *     Among unrated pick the shortest.
 *  3. Fallback: highest-rated among all routes.
 */
function pickSafestIndex(routes) {
    if (routes.length === 0) return 0;
    if (routes.length === 1) return 0;

    const HIGHLY_SAFE_THRESHOLD = 4.0;

    // Step 1: confirmed highly-safe rated routes
    const highlySafe = routes
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.hasRatings && r.safetyScore >= HIGHLY_SAFE_THRESHOLD);

    if (highlySafe.length > 0) {
        highlySafe.sort((a, b) =>
            b.r.safetyScore - a.r.safetyScore || a.r.distance - b.r.distance
        );
        return highlySafe[0].i;
    }

    // Step 2: prefer unrated routes (shortest first)
    const unrated = routes
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.hasRatings);

    if (unrated.length > 0) {
        unrated.sort((a, b) => a.r.distance - b.r.distance);
        return unrated[0].i;
    }

    // Step 3: all rated but none >= 4.0 — pick highest rated
    let bestIdx = 0;
    let bestScore = -1;
    routes.forEach((r, i) => {
        if (r.safetyScore > bestScore ||
            (r.safetyScore === bestScore && r.distance < routes[bestIdx].distance)) {
            bestScore = r.safetyScore;
            bestIdx = i;
        }
    });
    return bestIdx;
}

/**
 * Shortest route: always picks the route with the smallest distance,
 * regardless of safety rating.
 */
function pickShortestIndex(routes) {
    if (routes.length === 0) return 0;
    let shortestIdx = 0;
    routes.forEach((r, i) => {
        if (r.distance < routes[shortestIdx].distance) shortestIdx = i;
    });
    return shortestIdx;
}

export class RouteSafetyService {
    static async scoreRoutes(routes, radiusMeters = parseInt(process.env.ROUTE_SAFETY_RADIUS_METERS || '150')) {
        const scored = [];
        for (const route of routes) {
            const waypoints = sampleWaypoints(route.geometry);
            const totalSegments = waypoints.length;
            if (totalSegments === 0) {
                scored.push({
                    ...route,
                    safetyScore: 3.0,
                    hasRatings: false,
                    breakdown: { lighting: 3.0, pedestrian: 3.0, driver: 3.0, overall: 3.0, composite: 3.0, ratedSegmentCount: 0, totalSegments: 0 },
                });
                continue;
            }
            const valuePlaceholders = [];
            const queryParams = [radiusMeters];
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
            let avgLighting = 3.0, avgPedestrian = 3.0, avgDriver = 3.0, avgOverall = 3.0, ratedSegmentCount = 0, hasRatings = false;
            try {
                const result = await pool.query(query, queryParams);
                const row = result.rows[0];
                if (row && row.rating_count && parseInt(row.rating_count) > 0) {
                    ratedSegmentCount = parseInt(row.rating_count);
                    hasRatings = true;
                    avgLighting   = parseFloat(row.avg_lighting)   || 3.0;
                    avgPedestrian = parseFloat(row.avg_pedestrian) || 3.0;
                    avgDriver     = parseFloat(row.avg_driver)     || 3.0;
                    avgOverall    = parseFloat(row.avg_overall)    || 3.0;
                }
            } catch (err) {
                console.error(`[RouteSafetyService] Query error for route ${route.index}:`, err);
            }
            const composite = avgLighting * 0.20 + avgPedestrian * 0.45 + avgDriver * 0.15 + avgOverall * 0.20;
            scored.push({
                index: route.index,
                geometry: route.geometry,
                distance: route.distance,
                duration: route.duration,
                safetyScore: Math.round(composite * 100) / 100,
                hasRatings,
                breakdown: {
                    lighting:   Math.round(avgLighting   * 100) / 100,
                    pedestrian: Math.round(avgPedestrian * 100) / 100,
                    driver:     Math.round(avgDriver     * 100) / 100,
                    overall:    Math.round(avgOverall    * 100) / 100,
                    composite:  Math.round(composite    * 100) / 100,
                    ratedSegmentCount,
                    totalSegments,
                },
            });
        }
        scored.sort((a, b) => b.safetyScore - a.safetyScore);
        const safestRecommendedIndex  = pickSafestIndex(scored);
        const balancedRecommendedIndex = pickShortestIndex(scored);
        return { routes: scored, safestRecommendedIndex, balancedRecommendedIndex };
    }
}
