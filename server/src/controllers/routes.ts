import { Request, Response } from 'express';
import { RouteSafetyService } from '../services/route_safety.js';

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
   *   }>
   * }
   *
   * Returns ranked, scored routes.
   */
  static async scoreSafetyForRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { routes } = req.body;

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

      const scoredRoutes = await RouteSafetyService.scoreRoutes(routes);

      res.json({
        success: true,
        data: { routes: scoredRoutes },
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
