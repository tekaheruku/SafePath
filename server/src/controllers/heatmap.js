import { HeatmapService } from '../services/heatmap.js';
import { heatmapFilterSchema, validateSync } from '@safepath/shared/validators';
export class HeatmapController {
    /**
     * GET /api/v1/heatmap/data
     * Get heatmap dataset for specified bounds
     */
    static async getHeatmapData(req, res) {
        try {
            const filter = validateSync(heatmapFilterSchema, {
                min_latitude: req.query.minLat ? parseFloat(req.query.minLat) : undefined,
                max_latitude: req.query.maxLat ? parseFloat(req.query.maxLat) : undefined,
                min_longitude: req.query.minLng ? parseFloat(req.query.minLng) : undefined,
                max_longitude: req.query.maxLng ? parseFloat(req.query.maxLng) : undefined,
                days_back: req.query.daysBack ? parseInt(req.query.daysBack) : undefined,
                start_date: req.query.startDate,
                end_date: req.query.endDate,
            });
            const heatmapData = await HeatmapService.generateHeatmapData({
                ...filter,
                heatmap_type: req.query.type || 'all',
            });
            res.json({
                success: true,
                data: {
                    data: heatmapData.data,
                    bounds: {
                        min_lat: filter.min_latitude,
                        max_lat: filter.max_latitude,
                        min_lng: filter.min_longitude,
                        max_lng: filter.max_longitude,
                    },
                    generated_at: new Date().toISOString(),
                },
                timestamp: new Date().toISOString(),
                request_id: req.id,
            });
        }
        catch (error) {
            const isValidationError = error.isJoi || error.name === 'ValidationError';
            res.status(isValidationError ? 400 : 500).json({
                success: false,
                error: {
                    code: isValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
                    message: error.message,
                },
                timestamp: new Date().toISOString(),
                request_id: req.id,
            });
        }
    }
}
