import { StreetRatingService } from '../services/street_rating.js';
import { createStreetRatingSchema, paginationSchema, validateSync } from '@safepath/shared/validators';
import { IBA_POLYGON, isPointInPolygon } from '@safepath/shared';
import { HeatmapService } from '../services/heatmap.js';
import { SocketEventBroadcaster } from '../utils/socket-broadcaster.js';
export class StreetRatingController {
    /**
     * POST /api/v1/streets/ratings
     * Create a new street rating
     */
    static async createRating(req, res) {
        try {
            const data = validateSync(createStreetRatingSchema, req.body);
            // Boundary Check
            if (!isPointInPolygon([data.location.latitude, data.location.longitude], IBA_POLYGON)) {
                throw new Error('Location is outside the supported area (Iba, Zambales)');
            }
            // userId is mandatory
            const userId = req.user?.id;
            if (!userId) {
                throw new Error('You must be logged in to submit a rating');
            }
            const rating = await StreetRatingService.createRating(userId, data);
            res.status(201).json({
                success: true,
                data: rating,
                timestamp: new Date().toISOString(),
                request_id: req.id,
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
                });
                await HeatmapService.cacheHeatmapData(heatmapData.data);
                SocketEventBroadcaster.broadcastHeatmapUpdate(heatmapData.data);
            }
            catch (heatmapErr) {
                console.warn('Heatmap update failed (non-fatal):', heatmapErr);
            }
        }
        catch (error) {
            console.error('Error creating street rating:', error);
            res.status(400).json({
                success: false,
                error: {
                    code: 'CREATE_RATING_ERROR',
                    message: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                },
                timestamp: new Date().toISOString(),
                request_id: req.id,
            });
        }
    }
    /**
     * GET /api/v1/streets/ratings
     * List street ratings with optional filters
     */
    static async listRatings(req, res) {
        try {
            const paginationData = validateSync(paginationSchema, {
                page: req.query.page,
                limit: req.query.limit,
            });
            const filters = {
                minLat: req.query.minLat ? parseFloat(req.query.minLat) : undefined,
                maxLat: req.query.maxLat ? parseFloat(req.query.maxLat) : undefined,
                minLng: req.query.minLng ? parseFloat(req.query.minLng) : undefined,
                maxLng: req.query.maxLng ? parseFloat(req.query.maxLng) : undefined,
                daysBack: req.query.daysBack ? parseInt(req.query.daysBack) : undefined,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
            };
            const ratings = await StreetRatingService.listRatings(filters, paginationData.page, paginationData.limit);
            res.json({
                success: true,
                data: ratings,
                timestamp: new Date().toISOString(),
                request_id: req.id,
            });
        }
        catch (error) {
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
     * DELETE /api/v1/streets/ratings/:id
     * Delete a street rating
     */
    static async deleteRating(req, res) {
        try {
            await StreetRatingService.deleteRating(req.params.id, req.user.id, req.user.role);
            // Regenerate heatmap anonymously
            try {
                const rating = await StreetRatingService.listRatings({ id: req.params.id }); // This might not work if already deleted
                // Better: just trigger a global heatmap update or use a buffer around the deleted point if we had it.
                // For simplicity, we'll just broadcast a heatmap update event to trigger clients to re-fetch
                SocketEventBroadcaster.broadcastHeatmapUpdate([]);
            }
            catch (e) { }
            res.json({
                success: true,
                data: { message: 'Rating deleted' },
                timestamp: new Date().toISOString(),
                request_id: req.id,
            });
        }
        catch (error) {
            const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Unauthorized') ? 403 : 500;
            res.status(statusCode).json({
                success: false,
                error: {
                    code: error.code || 'DELETE_RATING_ERROR',
                    message: error.message,
                },
                timestamp: new Date().toISOString(),
                request_id: req.id,
            });
        }
    }
}
