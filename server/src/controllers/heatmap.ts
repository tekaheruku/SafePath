import { Request, Response } from 'express';
import { HeatmapService } from '../services/heatmap.js';
import { heatmapFilterSchema, validateSync } from '@safepath/shared/validators';

export class HeatmapController {
  /**
   * GET /api/v1/heatmap/data
   * Get heatmap dataset for specified bounds
   */
  static async getHeatmapData(req: Request, res: Response): Promise<void> {
    try {
      const filter = validateSync(heatmapFilterSchema, {
        min_latitude: req.query.minLat ? parseFloat(req.query.minLat as string) : undefined,
        max_latitude: req.query.maxLat ? parseFloat(req.query.maxLat as string) : undefined,
        min_longitude: req.query.minLng ? parseFloat(req.query.minLng as string) : undefined,
        max_longitude: req.query.maxLng ? parseFloat(req.query.maxLng as string) : undefined,
        days_back: req.query.daysBack ? parseInt(req.query.daysBack as string) : undefined,
        start_date: req.query.startDate as string,
        end_date: req.query.endDate as string,
      });

      const heatmapData = await HeatmapService.generateHeatmapData({
        ...filter,
        heatmap_type: (req.query.type as string) || 'all',
      } as any);

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
    } catch (error: any) {
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
