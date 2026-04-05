/**
 * Socket.IO Broadcasting Utilities
 * Helper functions to emit real-time events to connected clients
 */
import { SOCKET_EVENTS } from '@safepath/shared';
export class SocketEventBroadcaster {
    static setIO(io) {
        this.io = io;
    }
    /**
     * Broadcast new report to all connected clients
     */
    static broadcastNewReport(report) {
        if (!this.io)
            return;
        console.log(`[Socket.IO] Broadcasting new report: ${report.id}`);
        this.io.emit(SOCKET_EVENTS.REPORT_NEW, report);
        // Also emit to specific area rooms
        const roomId = `area_${Math.floor(report.location.latitude * 100)}_${Math.floor(report.location.longitude * 100)}`;
        this.io.to(roomId).emit(SOCKET_EVENTS.REPORT_NEW, report);
    }
    /**
     * Broadcast report update
     */
    static broadcastReportUpdate(report) {
        if (!this.io)
            return;
        console.log(`[Socket.IO] Broadcasting report update: ${report.id}`);
        this.io.emit(SOCKET_EVENTS.REPORT_UPDATED, report);
    }
    /**
     * Broadcast report deletion
     */
    static broadcastReportDelete(reportId) {
        if (!this.io)
            return;
        console.log(`[Socket.IO] Broadcasting report deletion: ${reportId}`);
        this.io.emit(SOCKET_EVENTS.REPORT_DELETED, { id: reportId });
    }
    /**
     * Broadcast new comment
     */
    static broadcastNewComment(reportId, comment) {
        if (!this.io)
            return;
        console.log(`[Socket.IO] Broadcasting new comment on report: ${reportId}`);
        this.io.emit(SOCKET_EVENTS.COMMENT_NEW, { report_id: reportId, comment });
    }
    /**
     * Broadcast heatmap update
     */
    static broadcastHeatmapUpdate(heatmapData) {
        if (!this.io)
            return;
        console.log(`[Socket.IO] Broadcasting heatmap update with ${heatmapData.length} points`);
        this.io.to('heatmap_channel').emit(SOCKET_EVENTS.HEATMAP_UPDATED, {
            data: heatmapData,
            updated_at: new Date().toISOString(),
        });
    }
}
