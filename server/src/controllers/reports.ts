/**
 * Reports Controller
 * Handles incident report endpoints: CRUD, comments
 */

import { Request, Response } from 'express';
import { ReportService } from '../services/report.js';
import {
  createReportSchema,
  updateReportSchema,
  createCommentSchema,
  paginationSchema,
  validateSync,
} from '@safepath/shared/validators';
import { HeatmapService } from '../services/heatmap.js';
import { SocketEventBroadcaster } from '../utils/socket-broadcaster.js';

export class ReportController {
  /**
   * POST /api/v1/reports
   * Create a new incident report
   */
  static async createReport(req: Request, res: Response): Promise<void> {
    try {
      const data = validateSync(createReportSchema, req.body);
      const report = await ReportService.createReport(req.user.id, data);

      // Broadcast new report
      SocketEventBroadcaster.broadcastNewReport(report as any);

      // Regenerate heatmap for the area
      const bufferDegrees = 0.05;
      const heatmapData = await HeatmapService.generateHeatmapData({
        min_latitude: data.location.latitude - bufferDegrees,
        max_latitude: data.location.latitude + bufferDegrees,
        min_longitude: data.location.longitude - bufferDegrees,
        max_longitude: data.location.longitude + bufferDegrees,
        days_back: 30,
      });

      // Cache and broadcast updated heatmap
      await HeatmapService.cacheHeatmapData(heatmapData.data);
      SocketEventBroadcaster.broadcastHeatmapUpdate(heatmapData.data);

      res.status(201).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * GET /api/v1/reports
   * List reports with optional filters
   */
  static async listReports(req: Request, res: Response): Promise<void> {
    try {
      const paginationData = validateSync(paginationSchema, {
        page: req.query.page,
        limit: req.query.limit,
      });

      const filters = {
        minLat: req.query.minLat ? parseFloat(req.query.minLat as string) : undefined,
        maxLat: req.query.maxLat ? parseFloat(req.query.maxLat as string) : undefined,
        minLng: req.query.minLng ? parseFloat(req.query.minLng as string) : undefined,
        maxLng: req.query.maxLng ? parseFloat(req.query.maxLng as string) : undefined,
        severity: req.query.severity as string,
        daysBack: req.query.daysBack ? parseInt(req.query.daysBack as string) : undefined,
      };

      const reports = await ReportService.listReports(filters, paginationData.page, paginationData.limit);

      res.json({
        success: true,
        data: reports,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * GET /api/v1/reports/:id
   * Get report details
   */
  static async getReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await ReportService.getReportById(req.params.id);
      if (!report) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Report not found',
          },
          timestamp: new Date().toISOString(),
          request_id: req.id,
        });
        return;
      }

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * PUT /api/v1/reports/:id
   * Update report
   */
  static async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const data = validateSync(updateReportSchema, req.body);
      const report = await ReportService.updateReport(req.params.id, req.user.id, data);

      // Broadcast update
      SocketEventBroadcaster.broadcastReportUpdate(report);

      // Regenerate heatmap for the area
      const bufferDegrees = 0.05;
      const heatmapData = await HeatmapService.generateHeatmapData({
        min_latitude: report.location.latitude - bufferDegrees,
        max_latitude: report.location.latitude + bufferDegrees,
        min_longitude: report.location.longitude - bufferDegrees,
        max_longitude: report.location.longitude + bufferDegrees,
        days_back: 30,
      });

      // Cache and broadcast updated heatmap
      await HeatmapService.cacheHeatmapData(heatmapData.data);
      SocketEventBroadcaster.broadcastHeatmapUpdate(heatmapData.data);

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * DELETE /api/v1/reports/:id
   * Delete report
   */
  static async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      // Get report location before deletion for heatmap update
      const report = await ReportService.getReportById(req.params.id);
      
      await ReportService.deleteReport(req.params.id, req.user.id, (req.user as any).role);

      // Broadcast deletion
      SocketEventBroadcaster.broadcastReportDelete(req.params.id);

      if (report) {
        // Regenerate heatmap for the area
        const bufferDegrees = 0.05;
        const heatmapData = await HeatmapService.generateHeatmapData({
          min_latitude: report.location.latitude - bufferDegrees,
          max_latitude: report.location.latitude + bufferDegrees,
          min_longitude: report.location.longitude - bufferDegrees,
          max_longitude: report.location.longitude + bufferDegrees,
          days_back: 30,
        });

        // Cache and broadcast updated heatmap
        await HeatmapService.cacheHeatmapData(heatmapData.data);
        SocketEventBroadcaster.broadcastHeatmapUpdate(heatmapData.data);
      }

      res.json({
        success: true,
        data: { message: 'Report deleted' },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }
}
