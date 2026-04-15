import { RouteSafetyService } from '../services/route_safety.js';

export class RoutesController {
    static async scoreSafetyForRoutes(req, res) {
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
            const result = await RouteSafetyService.scoreRoutes(routes);
            res.json({
                success: true,
                data: {
                    routes: result.routes,
                    safestRecommendedIndex: result.safestRecommendedIndex,
                    balancedRecommendedIndex: result.balancedRecommendedIndex,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
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
