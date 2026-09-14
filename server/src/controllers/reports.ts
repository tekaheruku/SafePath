/**
 * Reports Controller
 * Handles incident report endpoints: CRUD, comments
 */

import { Request, Response } from 'express';
import { ReportService } from '../services/report.js';
import {
  createReportSchema,
  updateReportSchema,
  paginationSchema,
  validateSync,
} from '@safepath/shared/validators';
import { IBA_POLYGON, isPointInPolygon, REPORT_STATUS } from '@safepath/shared';
import { HeatmapService } from '../services/heatmap.js';
import { SocketEventBroadcaster } from '../utils/socket-broadcaster.js';
import { ReportClassifierService } from '../services/report-classifier.js';

export class ReportController {
  /**
   * POST /api/v1/reports
   * Create a new incident report
   */
  static async createReport(req: Request, res: Response): Promise<void> {
    try {
      const data = validateSync(createReportSchema, req.body);
      
      // Boundary Check
      if (!isPointInPolygon([data.location.latitude, data.location.longitude], IBA_POLYGON)) {
        throw new Error('Location is outside the supported area (Iba, Zambales)');
      }

      const report = await ReportService.createReport(req.user.id, data);

      // Broadcast new report
      SocketEventBroadcaster.broadcastNewReport(report as any);

      // Score plausibility in the background so LLM latency never delays report creation.
      ReportService.getReportById(report.id)
        .then((fullReport) => ReportClassifierService.scoreReport({
          description: data.description,
          incidentTypeName: fullReport?.incident_type_name,
          severityLevelName: fullReport?.severity_level_name,
          photoUrl: fullReport?.photo_url,
        }))
        .then(async ({ plausibility, reason, breakdown }) => {
          const scoredReport = await ReportService.updateAiScore(report.id, plausibility, reason, breakdown);
          if (scoredReport) {
            SocketEventBroadcaster.broadcastReportUpdate(scoredReport);
          }
        })
        .catch((error) => console.error('Failed to score report plausibility:', error));

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
   * GET /api/v1/reports/stats/:userId
   * Get aggregate report stats for a specific user (dashboard use)
   */
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const stats = await ReportService.getStatsByUserId(userId);
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
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
        incident_type_id: req.query.type as string,
        daysBack: req.query.daysBack ? parseInt(req.query.daysBack as string) : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        userId: req.query.userId as string | undefined,
        status: req.query.status as string | undefined,
        userRole: (req as any).user?.role,
      };

      const currentUserId = (req as any).user?.id;
      const reports = await ReportService.listReports({ ...filters, currentUserId }, paginationData.page, paginationData.limit);


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
      const currentUserId = (req as any).user?.id;
      const report = await ReportService.getReportById(req.params.id, currentUserId);

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

  /**
   * POST /api/v1/reports/:id/confirm
   * Admin/LGU action: Confirm a pending report (publish to public map/feed)
   */
  static async confirmReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await ReportService.updateReportStatus(
        req.params.id,
        REPORT_STATUS.CONFIRMED,
        (req as any).user.role
      );

      // Broadcast report status update
      SocketEventBroadcaster.broadcastReportUpdate(report);

      // Regenerate heatmap now that report is confirmed
      if (report.location?.coordinates) {
        const [lng, lat] = report.location.coordinates;
        const bufferDegrees = 0.05;
        const heatmapData = await HeatmapService.generateHeatmapData({
          min_latitude: lat - bufferDegrees,
          max_latitude: lat + bufferDegrees,
          min_longitude: lng - bufferDegrees,
          max_longitude: lng + bufferDegrees,
          days_back: 30,
        });
        await HeatmapService.cacheHeatmapData(heatmapData.data);
        SocketEventBroadcaster.broadcastHeatmapUpdate(heatmapData.data);
      }

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Forbidden') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: { code: 'STATUS_UPDATE_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * POST /api/v1/reports/:id/falsify
   * Admin/LGU action: Falsify a report (moves it to the Archive)
   */
  static async falsifyReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await ReportService.updateReportStatus(
        req.params.id,
        REPORT_STATUS.FALSIFIED,
        (req as any).user.role
      );

      // Broadcast report update
      SocketEventBroadcaster.broadcastReportUpdate(report);

      // Regenerate heatmap in case it was previously confirmed
      if (report.location?.coordinates) {
        const [lng, lat] = report.location.coordinates;
        const bufferDegrees = 0.05;
        const heatmapData = await HeatmapService.generateHeatmapData({
          min_latitude: lat - bufferDegrees,
          max_latitude: lat + bufferDegrees,
          min_longitude: lng - bufferDegrees,
          max_longitude: lng + bufferDegrees,
          days_back: 30,
        });
        await HeatmapService.cacheHeatmapData(heatmapData.data);
        SocketEventBroadcaster.broadcastHeatmapUpdate(heatmapData.data);
      }

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Forbidden') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: { code: 'STATUS_UPDATE_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * POST /api/v1/reports/:id/restore
   * Admin/LGU action: Restore an archived/falsified report back to pending review
   */
  static async restoreReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await ReportService.updateReportStatus(
        req.params.id,
        REPORT_STATUS.PENDING,
        (req as any).user.role
      );

      // Broadcast report update
      SocketEventBroadcaster.broadcastReportUpdate(report);

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Forbidden') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: { code: 'STATUS_UPDATE_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * GET /api/v1/reports/archive
   * Admin/LGU action: List all falsified reports in the archive
   */
  static async listArchivedReports(req: Request, res: Response): Promise<void> {
    try {
      const paginationData = validateSync(paginationSchema, {
        page: req.query.page,
        limit: req.query.limit,
      });

      const filters = {
        severity: req.query.severity as string,
        incident_type_id: req.query.type as string,
        daysBack: req.query.daysBack ? parseInt(req.query.daysBack as string) : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        userId: req.query.userId as string | undefined,
        status: REPORT_STATUS.FALSIFIED,
        userRole: (req as any).user?.role,
      };

      const currentUserId = (req as any).user?.id;
      const reports = await ReportService.listReports({ ...filters, currentUserId }, paginationData.page, paginationData.limit);

      res.json({
        success: true,
        data: reports,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * GET /api/v1/reports/nearby-similar
   * Advisory only: surfaces recent, active reports of the same incident type near a
   * location so a submitter can be nudged toward commenting instead of duplicating.
   * Never blocks report creation.
   */
  static async nearbySimilar(req: Request, res: Response): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const incidentTypeId = req.query.incident_type_id as string;

      if (!lat || !lng || !incidentTypeId) {
        throw new Error('lat, lng, and incident_type_id are required');
      }

      const reports = await ReportService.findNearbySimilar(lat, lng, incidentTypeId);

      res.json({
        success: true,
        data: reports,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * POST /api/v1/reports/:id/analyze
   * Admin/LGU action: manually (re-)run AI plausibility scoring on demand — e.g. to
   * check the current AI verdict without waiting, or to re-score after a description/
   * photo edit. Runs synchronously (unlike the background scoring on creation) since
   * this is an explicit, user-initiated action expecting an immediate result.
   */
  static async analyzeReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await ReportService.getReportById(req.params.id);
      if (!report) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' },
          timestamp: new Date().toISOString(),
          request_id: req.id,
        });
        return;
      }

      const { plausibility, reason, breakdown } = await ReportClassifierService.scoreReport({
        description: report.description,
        incidentTypeName: report.incident_type_name,
        severityLevelName: report.severity_level_name,
        photoUrl: report.photo_url,
      });

      const scoredReport = await ReportService.updateAiScore(report.id, plausibility, reason, breakdown);
      if (scoredReport) {
        SocketEventBroadcaster.broadcastReportUpdate(scoredReport);
      }

      res.json({
        success: true,
        data: scoredReport,
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }
}

