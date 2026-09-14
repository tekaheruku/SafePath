import { Request, Response } from 'express';
import { RouteSafetyService, RouteProfile } from '../services/route_safety.js';

const VALID_PROFILES: RouteProfile[] = ['foot', 'bike', 'car'];

export class RoutesController {
  /**
   * POST /api/v1/routes/safety
   *
   * Body: {
   *   routes: Array<{
   *     index: number,
   *     geometry: [number, number][],   // [lng, lat] pairs (GeoJSON order)
   *     distance: number,
   *     duration: number
   *   }>,
   *   profile?: 'foot' | 'bike' | 'car'   // defaults to 'foot'
   * }
   *
   * Returns ranked, scored routes with recommended indexes for each mode.
   * `safestRecommendedIndex` is null when safety data could not be loaded.
   */
  static async scoreSafetyForRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { routes, profile } = req.body;

      if (!Array.isArray(routes) || routes.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: '`routes` must be a non-empty array' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate each route has geometry
      for (const r of routes) {
        if (!Array.isArray(r.geometry) || r.geometry.length === 0) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_GEOMETRY', message: `Route ${r.index}: geometry must be a non-empty array of [lng, lat] pairs` },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Omitted profile keeps the previous behaviour for any older client.
      const safeProfile: RouteProfile = VALID_PROFILES.includes(profile) ? profile : 'foot';

      const result = await RouteSafetyService.scoreRoutes(routes, safeProfile);

      res.json({
        success: true,
        data: {
          routes: result.routes,
          safestRecommendedIndex: result.safestRecommendedIndex,
          balancedRecommendedIndex: result.balancedRecommendedIndex,
          degraded: result.degraded,
          degradedReason: result.degradedReason,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[RoutesController] Error scoring routes:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ROUTE_SCORING_ERROR',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
