import { pool } from '../config/database.js';
/**
 * Sample every Nth waypoint of a geometry so we don't send 1000s of DB
 * queries for a long route. For Iba's small area this is fine at every 5th.
 */
function sampleWaypoints(coords, maxSamples = 60) {
    if (coords.length === 0)
        return [];
    const step = Math.max(1, Math.floor(coords.length / maxSamples));
    const sampled = [];
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
 *  1. If any rated route has a score >= 4.0 (confirmed very safe), pick the
 *     one with the HIGHEST safety score, even if it is longer.
 *  2. Otherwise, prefer unrated routes (unknown area = not confirmed dangerous).
 *     Among unrated candidates, pick the shortest.
 *  3. Fallback: pick the highest-rated route among all rated options.
 */
function pickSafestIndex(routes) {
    if (routes.length === 0)
        return 0;
    if (routes.length === 1)
        return 0;
    const HIGHLY_SAFE_THRESHOLD = 4.0;
    // Step 1: Is there any confirmed highly-safe rated route?
    const highlySafe = routes
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.hasRatings && r.safetyScore >= HIGHLY_SAFE_THRESHOLD);
    if (highlySafe.length > 0) {
        // Pick the one with the highest safety score (longest if tie — safety wins)
        highlySafe.sort((a, b) => b.r.safetyScore - a.r.safetyScore ||
            a.r.distance - b.r.distance);
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
    // Step 3: All routes are rated but none reach 4.0 — pick the highest-rated
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
 * Determine the best "shortest" route index.
 *
 * Simply picks the route with the smallest distance, regardless of safety.
 * The user has explicitly opted for speed/convenience over safety.
 */
function pickShortestIndex(routes) {
    if (routes.length === 0)
        return 0;
    let shortestIdx = 0;
    routes.forEach((r, i) => {
        if (r.distance < routes[shortestIdx].distance)
            shortestIdx = i;
    });
    return shortestIdx;
}
export class RouteSafetyService {
    /**
     * Score an array of OSRM routes (geometry in [lng,lat] pairs) by querying
     * nearby street_ratings from PostGIS and averaging the four safety scores.
     *
     * Returns routes sorted by safety score descending, plus recommended
     * indexes for 'safest' and 'balanced' modes.
     *
     * @param routes        Array of { index, geometry, distance, duration }
     * @param radiusMeters  Search radius around each sampled waypoint
     */
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
            let avgLighting = 3.0;
            let avgPedestrian = 3.0;
            let avgDriver = 3.0;
            let avgOverall = 3.0;
            let ratedSegmentCount = 0;
            let hasRatings = false;
            try {
                const result = await pool.query(query, queryParams);
                const row = result.rows[0];
                if (row && row.rating_count && parseInt(row.rating_count) > 0) {
                    ratedSegmentCount = parseInt(row.rating_count);
                    hasRatings = true;
                    avgLighting = parseFloat(row.avg_lighting) || 3.0;
                    avgPedestrian = parseFloat(row.avg_pedestrian) || 3.0;
                    avgDriver = parseFloat(row.avg_driver) || 3.0;
                    avgOverall = parseFloat(row.avg_overall) || 3.0;
                }
            }
            catch (err) {
                console.error(`[RouteSafetyService] Query error for route ${route.index}:`, err);
                // Fall through with neutral defaults
            }
            // Composite: weighted average (pedestrian safety weighted highest for walking)
            const composite = (avgLighting * 0.20 +
                avgPedestrian * 0.45 +
                avgDriver * 0.15 +
                avgOverall * 0.20);
            scored.push({
                index: route.index,
                geometry: route.geometry,
                distance: route.distance,
                duration: route.duration,
                safetyScore: Math.round(composite * 100) / 100,
                hasRatings,
                breakdown: {
                    lighting: Math.round(avgLighting * 100) / 100,
                    pedestrian: Math.round(avgPedestrian * 100) / 100,
                    driver: Math.round(avgDriver * 100) / 100,
                    overall: Math.round(avgOverall * 100) / 100,
                    composite: Math.round(composite * 100) / 100,
                    ratedSegmentCount,
                    totalSegments,
                },
            });
        }
        // Sort by safety score descending (safest first)
        scored.sort((a, b) => b.safetyScore - a.safetyScore);
        const safestRecommendedIndex = pickSafestIndex(scored);
        const balancedRecommendedIndex = pickShortestIndex(scored);
        return {
            routes: scored,
            safestRecommendedIndex,
            balancedRecommendedIndex,
        };
    }
}
