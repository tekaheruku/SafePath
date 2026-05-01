import { pool } from '../config/database.js';
import { ADMIN_ROLES } from '@safepath/shared';
export class ReportService {
    /**
     * Create a new incident report
     */
    static async createReport(userId, data) {
        const { incident_type_id, severity_level_id, description, location, photo_url } = data;
        const query = `
      INSERT INTO reports (user_id, incident_type_id, severity_level_id, description, location, upvotes_count, downvotes_count, photo_url)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 0, 0, $7)
      RETURNING id, user_id, incident_type_id, severity_level_id, description, 
                ST_AsGeoJSON(location)::json as location, upvotes_count, downvotes_count, photo_url, created_at, updated_at
    `;
        const params = [userId, incident_type_id, severity_level_id, description, location.longitude, location.latitude, photo_url || null];
        const result = await pool.query(query, params);
        return result.rows[0];
    }
    /**
     * List reports with filters
     */
    static async listReports(filters, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        // Geographic filter
        if (filters?.minLat !== undefined && filters?.maxLat !== undefined && filters?.minLng !== undefined && filters?.maxLng !== undefined) {
            whereClause += ` AND ST_DWithin(r.location::geography,
        ST_MakeEnvelope($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 4326)::geography, 0)`;
            params.push(filters.minLng, filters.minLat, filters.maxLng, filters.maxLat);
            paramIndex += 4;
        }
        // Severity filter
        if (filters?.severity_level_id) {
            whereClause += ` AND r.severity_level_id = $${paramIndex}`;
            params.push(filters.severity_level_id);
            paramIndex++;
        }
        // Time filter
        if (filters?.startDate && filters?.endDate) {
            whereClause += ` AND r.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(filters.startDate, filters.endDate);
            paramIndex += 2;
        }
        else if (filters?.daysBack) {
            whereClause += ` AND r.created_at >= NOW() - ($${paramIndex}::text || ' days')::interval`;
            params.push(filters.daysBack);
            paramIndex++;
        }
        const query = `
      SELECT r.id, r.user_id, r.incident_type_id, r.severity_level_id, r.description,
             ST_AsGeoJSON(r.location)::json as location, r.created_at, r.updated_at,
             r.upvotes_count, r.downvotes_count, r.photo_url,
             u.name as author_name,
             it.name as incident_type_name, it.icon as incident_type_icon,
             sl.name as severity_level_name, sl.color_code as severity_level_color
             ${filters?.currentUserId ? `, (SELECT vote_type FROM report_votes WHERE report_id = r.id AND user_id = $${paramIndex}) as user_vote` : ''}
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN incident_types it ON r.incident_type_id = it.id
      LEFT JOIN severity_levels sl ON r.severity_level_id = sl.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${filters?.currentUserId ? paramIndex + 1 : paramIndex} OFFSET $${filters?.currentUserId ? paramIndex + 2 : paramIndex + 1}
    `;
        if (filters?.currentUserId)
            params.push(filters.currentUserId);
        params.push(limit, offset);
        const result = await pool.query(query, params);
        // Total count for pagination
        const countQuery = `SELECT COUNT(*) FROM reports r ${whereClause}`;
        const countResult = await pool.query(countQuery, params.slice(0, params.length - 2));
        return {
            reports: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page,
                limit,
                pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
            }
        };
    }
    /**
     * Get report by ID
     */
    static async getReportById(id, currentUserId) {
        const query = `
      SELECT r.id, r.user_id, r.incident_type_id, r.severity_level_id, r.description,
             ST_AsGeoJSON(r.location)::json as location, r.created_at, r.updated_at,
             r.upvotes_count, r.downvotes_count, r.photo_url,
             u.name as author_name,
             it.name as incident_type_name, it.icon as incident_type_icon,
             sl.name as severity_level_name, sl.color_code as severity_level_color
             ${currentUserId ? `, (SELECT vote_type FROM report_votes WHERE report_id = r.id AND user_id = $2) as user_vote` : ''}
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN incident_types it ON r.incident_type_id = it.id
      LEFT JOIN severity_levels sl ON r.severity_level_id = sl.id
      WHERE r.id = $1
    `;
        const params = currentUserId ? [id, currentUserId] : [id];
        const result = await pool.query(query, params);
        return result.rows[0] || null;
    }
    static async updateReport(id, userId, data) {
        const { incident_type_id, severity_level_id, description } = data;
        let updateClause = 'updated_at = NOW()';
        const params = [id, userId];
        let paramIndex = 3;
        if (incident_type_id) {
            updateClause += `, incident_type_id = $${paramIndex}`;
            params.push(incident_type_id);
            paramIndex++;
        }
        if (severity_level_id !== undefined) {
            updateClause += `, severity_level_id = $${paramIndex}`;
            params.push(severity_level_id);
            paramIndex++;
        }
        if (description) {
            updateClause += `, description = $${paramIndex}`;
            params.push(description);
            paramIndex++;
        }
        const query = `
      UPDATE reports 
      SET ${updateClause}
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, incident_type_id, severity_level_id, description, 
                ST_AsGeoJSON(location)::json as location, created_at, updated_at
    `;
        const result = await pool.query(query, params);
        if (result.rowCount === 0)
            throw new Error('Report not found or Unauthorized');
        return result.rows[0];
    }
    static async deleteReport(id, userId, userRole) {
        const isAdmin = ADMIN_ROLES.includes(userRole);
        let query;
        let params;
        if (isAdmin) {
            query = 'DELETE FROM reports WHERE id = $1';
            params = [id];
        }
        else {
            query = 'DELETE FROM reports WHERE id = $1 AND user_id = $2';
            params = [id, userId];
        }
        const result = await pool.query(query, params);
        if (result.rowCount === 0)
            throw new Error('Report not found or Unauthorized');
    }
}
