import { Request, Response } from 'express';
import { StreetRatingService } from '../services/street_rating.js';
import { createStreetRatingSchema, validateSync } from '@safepath/shared/validators';
import { HeatmapService } from '../services/heatmap.js';
import { SocketEventBroadcaster } from '../utils/socket-broadcaster.js';

export class StreetRatingController {
  /**
   * POST /api/v1/streets/ratings
   * Create a new street rating
   */
  static async createRating(req: Request, res: Response): Promise<void> {
    try {
      const data = validateSync(createStreetRatingSchema, req.body) as any;
      
      // userId is optional if anonymous ratings are allowed
      const userId = (req as any).user?.id;
      
      const rating = await StreetRatingService.createRating(userId, data);

      res.status(201).json({
        success: true,
        data: rating,
        timestamp: new Date().toISOString(),
        request_id: (req as any).id,
      });

      // Regenerate heatmap asynchronously — don't let errors here affect the response
      try {
        const bufferDegrees = 0.05;
        const heatmapData = await HeatmapService.generateHeatmapData({
          min_latitude: data.location.latitude - bufferDegrees,
          max_latitude: data.location.latitude + bufferDegrees,
          min_longitude: data.location.longitude - bufferDegrees,
          max_longitude: data.location.longitude + bufferDegrees,
          days_back: 30,
        } as any);
        await HeatmapService.cacheHeatmapData(heatmapData.data);
        SocketEventBroadcaster.broadcastHeatmapUpdate(heatmapData.data);
      } catch (heatmapErr) {
        console.warn('Heatmap update failed (non-fatal):', heatmapErr);
      }
    } catch (error: any) {
      console.error('Error creating street rating:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_RATING_ERROR',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: new Date().toISOString(),
        request_id: (req as any).id,
      });
    }
  }
}
