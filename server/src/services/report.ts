import { pool } from '../config/database.js';
import { Report, ReportWithUser, ADMIN_ROLES, REPORT_REVIEW_ROLES, REPORT_STATUS, ReportStatus, SUSPICIOUS_VOTE_THRESHOLD } from '@safepath/shared';

const VOTE_FLAG_SQL = `(r.downvotes_count >= ${SUSPICIOUS_VOTE_THRESHOLD.MIN_DOWNVOTES} AND r.downvotes_count > r.upvotes_count * ${SUSPICIOUS_VOTE_THRESHOLD.DOWNVOTE_TO_UPVOTE_RATIO})`;

// Aggregated comment vote totals feed into the frontend's plausibility tier alongside
// report-level votes and the AI score, so well-corroborated comments raise credibility too.
const COMMENT_AGGREGATE_SQL = `
             COALESCE((SELECT SUM(upvotes_count) FROM report_comments WHERE report_id = r.id), 0) as comment_upvotes_total,
             COALESCE((SELECT SUM(downvotes_count) FROM report_comments WHERE report_id = r.id), 0) as comment_downvotes_total,
             (SELECT COUNT(*) FROM report_comments WHERE report_id = r.id) as comment_count`;

/**
 * Single reusable SQL filter for confirmed reports (public map and public feed visibility)
 */
export function getConfirmedReportsFilter(alias: string = 'r'): string {
  return `${alias}.status = '${REPORT_STATUS.CONFIRMED}'`;
}

/**
 * Reusable visibility condition:
 * - Public/regular users (role not in ADMIN_ROLES): strictly confirmed reports only.
 * - Admin/PNP users: can filter by status (pending, confirmed, falsified),
 *   or if not specified, defaults to active reports (pending and confirmed).
 */
export function getReportStatusCondition(
  userRole?: string,
  requestedStatus?: string,
  paramIndexStart: number = 1,
  alias: string = 'r'
): { sql: string; params: any[]; nextParamIndex: number } {
  const isAdmin = userRole ? ADMIN_ROLES.includes(userRole as any) : false;

  if (!isAdmin) {
    return {
      sql: ` AND ${getConfirmedReportsFilter(alias)}`,
      params: [],
      nextParamIndex: paramIndexStart,
    };
  }

  // Admin/PNP user requesting a specific status
  if (requestedStatus) {
    return {
      sql: ` AND ${alias}.status = $${paramIndexStart}`,
      params: [requestedStatus],
      nextParamIndex: paramIndexStart + 1,
    };
  }

  // Default for Admin/PNP: show active (pending + confirmed), exclude falsified (archived)
  return {
    sql: ` AND ${alias}.status IN ('${REPORT_STATUS.PENDING}', '${REPORT_STATUS.CONFIRMED}')`,
    params: [],
    nextParamIndex: paramIndexStart,
  };
}

export class ReportService {
  /**
   * Create a new incident report
   */
  static async createReport(userId: string, data: any): Promise<any> {
    const { incident_type_id, severity_level_id, description, location, photo_url } = data;
    
    const query = `
      INSERT INTO reports (user_id, incident_type_id, severity_level_id, description, location, upvotes_count, downvotes_count, photo_url, status)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 0, 0, $7, $8)
      RETURNING id, user_id, incident_type_id, severity_level_id, description, 
                ST_AsGeoJSON(location)::json as location, upvotes_count, downvotes_count, photo_url, status, created_at, updated_at
    `;
    const params = [userId, incident_type_id, severity_level_id, description, location.longitude, location.latitude, photo_url || null, REPORT_STATUS.PENDING];
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * List reports with filters
   */
  static async listReports(filters?: any, page: number = 1, limit: number = 20): Promise<any> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Status & Visibility filter (enforces public visibility strictly to confirmed)
    let statusCond: { sql: string; params: any[]; nextParamIndex: number };
    if (filters?.mine) {
      // Self-view: the caller sees all of their own reports regardless of role,
      // except ones they (or an admin) deleted — those are archive-only from here on.
      statusCond = { sql: ` AND r.status != '${REPORT_STATUS.DELETED}'`, params: [], nextParamIndex: paramIndex };
    } else if (filters?.archived) {
      // Archive view: falsified and deleted reports, both hidden from public/pending views.
      statusCond = { sql: ` AND r.status IN ('${REPORT_STATUS.FALSIFIED}', '${REPORT_STATUS.DELETED}')`, params: [], nextParamIndex: paramIndex };
    } else {
      statusCond = getReportStatusCondition(filters?.userRole, filters?.status, paramIndex, 'r');
    }
    whereClause += statusCond.sql;
    params.push(...statusCond.params);
    paramIndex = statusCond.nextParamIndex;

    // Geographic filter
    if (filters?.minLat !== undefined && filters?.maxLat !== undefined && filters?.minLng !== undefined && filters?.maxLng !== undefined) {
      whereClause += ` AND ST_DWithin(r.location::geography,
        ST_MakeEnvelope($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 4326)::geography, 0)`;
      params.push(filters.minLng, filters.minLat, filters.maxLng, filters.maxLat);
      paramIndex += 4;
    }

    // User filter
    if (filters?.userId) {
      whereClause += ` AND r.user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    // Severity filter
    if (filters?.severity_level_id) {
      whereClause += ` AND r.severity_level_id = $${paramIndex}`;
      params.push(filters.severity_level_id);
      paramIndex++;
    }

    // Incident Type filter
    if (filters?.incident_type_id) {
      whereClause += ` AND r.incident_type_id = $${paramIndex}`;
      params.push(filters.incident_type_id);
      paramIndex++;
    }

    // Time filter
    if (filters?.startDate && filters?.endDate) {
      whereClause += ` AND r.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.startDate, filters.endDate);
      paramIndex += 2;
    } else if (filters?.daysBack) {
      whereClause += ` AND r.created_at >= NOW() - ($${paramIndex}::text || ' days')::interval`;
      params.push(filters.daysBack);
      paramIndex++;
    }

    const whereParams = [...params];

    const query = `
      SELECT r.id, r.user_id, r.incident_type_id, r.severity_level_id, r.description,
             ST_AsGeoJSON(r.location)::json as location, r.created_at, r.updated_at,
             r.upvotes_count, r.downvotes_count, r.photo_url, r.status,
             r.ai_plausibility_score, r.ai_flag_reason, r.ai_score_breakdown,
             ${VOTE_FLAG_SQL} as is_vote_flagged,
             ${COMMENT_AGGREGATE_SQL},
             u.name as author_name,
             u.trust_score, u.confirmed_reports_count, u.falsified_reports_count,
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
    const queryParams = [...whereParams];
    if (filters?.currentUserId) queryParams.push(filters.currentUserId);
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Total count for pagination
    const countQuery = `SELECT COUNT(*) FROM reports r ${whereClause}`;
    const countResult = await pool.query(countQuery, whereParams);

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
   * Get aggregate stats for a specific user
   * Returns total reports, total upvotes received, and a breakdown by incident type.
   */
  static async getStatsByUserId(userId: string): Promise<any> {
    const statsQuery = `
      SELECT
        COUNT(*) AS total_reports,
        COALESCE(SUM(r.upvotes_count), 0) AS total_upvotes,
        COALESCE(SUM(r.downvotes_count), 0) AS total_downvotes
      FROM reports r
      WHERE r.user_id = $1 AND r.status = '${REPORT_STATUS.CONFIRMED}'
    `;

    const byTypeQuery = `
      SELECT
        it.name AS incident_type_name,
        COUNT(*) AS count
      FROM reports r
      LEFT JOIN incident_types it ON r.incident_type_id = it.id
      WHERE r.user_id = $1 AND r.status = '${REPORT_STATUS.CONFIRMED}'
      GROUP BY it.name
      ORDER BY count DESC
    `;

    const [statsResult, byTypeResult] = await Promise.all([
      pool.query(statsQuery, [userId]),
      pool.query(byTypeQuery, [userId]),
    ]);

    const row = statsResult.rows[0];
    return {
      total_reports: parseInt(row.total_reports),
      total_upvotes: parseInt(row.total_upvotes),
      total_downvotes: parseInt(row.total_downvotes),
      by_type: byTypeResult.rows,
    };
  }

  /**
   * Get report by ID
   */
  static async getReportById(id: string, currentUserId?: string): Promise<any | null> {
    const query = `
      SELECT r.id, r.user_id, r.incident_type_id, r.severity_level_id, r.description,
             ST_AsGeoJSON(r.location)::json as location, r.created_at, r.updated_at,
             r.upvotes_count, r.downvotes_count, r.photo_url, r.status,
             r.ai_plausibility_score, r.ai_flag_reason, r.ai_score_breakdown,
             ${VOTE_FLAG_SQL} as is_vote_flagged,
             ${COMMENT_AGGREGATE_SQL},
             u.name as author_name,
             u.trust_score, u.confirmed_reports_count, u.falsified_reports_count,
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

  /**
   * Update report status (admin/PNP action: confirm, falsify, restore).
   * Confirming or falsifying a report that was previously pending also recomputes
   * the reporting user's trust score, so only first-time decisions count — a later
   * restore-then-decide-again cycle must not double count.
   */
  static async updateReportStatus(id: string, status: ReportStatus, userRole: string): Promise<any> {
    const canReview = REPORT_REVIEW_ROLES.includes(userRole as any);
    if (!canReview) {
      throw new Error('Forbidden: Only PNP officials can update report status');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const current = await client.query('SELECT user_id, status FROM reports WHERE id = $1 FOR UPDATE', [id]);
      if (current.rowCount === 0) throw new Error('Report not found');
      const { user_id: reportUserId, status: previousStatus } = current.rows[0];

      const updateResult = await client.query(
        `UPDATE reports
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, user_id, incident_type_id, severity_level_id, description,
                   ST_AsGeoJSON(location)::json as location, upvotes_count, downvotes_count, photo_url, status, created_at, updated_at`,
        [status, id]
      );

      const isFirstTimeDecision = previousStatus === REPORT_STATUS.PENDING;
      if (isFirstTimeDecision && (status === REPORT_STATUS.CONFIRMED || status === REPORT_STATUS.FALSIFIED)) {
        const countColumn = status === REPORT_STATUS.CONFIRMED ? 'confirmed_reports_count' : 'falsified_reports_count';
        // Increment the relevant count, then recompute trust_score from the fresh totals
        // using Laplace smoothing so a single early falsified report doesn't zero out a new user.
        await client.query(
          `UPDATE users SET ${countColumn} = ${countColumn} + 1 WHERE id = $1`,
          [reportUserId]
        );
        await client.query(
          `UPDATE users
           SET trust_score = (confirmed_reports_count + 1)::float / (confirmed_reports_count + falsified_reports_count + 2)
           WHERE id = $1`,
          [reportUserId]
        );
      }

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Persist an AI plausibility score (and its text/photo component breakdown, so
   * admins can see what drove it) computed asynchronously after report creation.
   */
  static async updateAiScore(id: string, plausibility: number | null, reason: string | null, breakdown?: unknown): Promise<any> {
    const result = await pool.query(
      `UPDATE reports SET ai_plausibility_score = $1, ai_flag_reason = $2, ai_score_breakdown = $3, updated_at = NOW() WHERE id = $4
       RETURNING id, user_id, incident_type_id, severity_level_id, description,
                 ST_AsGeoJSON(location)::json as location, upvotes_count, downvotes_count, photo_url, status,
                 ai_plausibility_score, ai_flag_reason, ai_score_breakdown, created_at, updated_at`,
      [plausibility, reason, breakdown ? JSON.stringify(breakdown) : null, id]
    );
    return result.rows[0] || null;
  }

  static async updateReport(id: string, userId: string, data: any): Promise<any> {
    const { incident_type_id, severity_level_id, description } = data;

    let updateClause = 'updated_at = NOW()';
    const params: any[] = [id, userId];
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
                ST_AsGeoJSON(location)::json as location, status, created_at, updated_at
    `;
    const result = await pool.query(query, params);
    if (result.rowCount === 0) throw new Error('Report not found or Unauthorized');
    return result.rows[0];
  }

  /**
   * "Deleting" a report is a soft delete — it drops off every public/pending view
   * immediately (status !== 'confirmed'/'pending') but the row is kept and lands in
   * the archive (alongside falsified reports) so it stays recoverable via restore
   * or auditable, rather than vanishing outright.
   */
  static async deleteReport(id: string, userId: string, userRole: string): Promise<void> {
    const isAdmin = ADMIN_ROLES.includes(userRole as any);

    let query: string;
    let params: any[];

    if (isAdmin) {
      query = `UPDATE reports SET status = '${REPORT_STATUS.DELETED}', updated_at = NOW() WHERE id = $1`;
      params = [id];
    } else {
      query = `UPDATE reports SET status = '${REPORT_STATUS.DELETED}', updated_at = NOW() WHERE id = $1 AND user_id = $2`;
      params = [id, userId];
    }

    const result = await pool.query(query, params);
    if (result.rowCount === 0) throw new Error('Report not found or Unauthorized');
  }

  /**
   * Permanently removes a report from the database. Only ever allowed for reports
   * already sitting in the archive (falsified or deleted) — this is the "empty the
   * trash" action on the archive page, never a way to remove an active report.
   */
  static async purgeReport(id: string, userRole: string): Promise<void> {
    if (!REPORT_REVIEW_ROLES.includes(userRole as any)) {
      throw new Error('Forbidden: Only PNP officials can permanently delete archived reports');
    }

    const result = await pool.query(
      `DELETE FROM reports WHERE id = $1 AND status IN ('${REPORT_STATUS.FALSIFIED}', '${REPORT_STATUS.DELETED}')`,
      [id]
    );
    if (result.rowCount === 0) throw new Error('Report not found or not archived');
  }

  /**
   * Find recent, active reports of the same incident type near a location — used to
   * softly nudge a submitter toward commenting on an existing report instead of
   * filing a duplicate. Never blocks submission; purely advisory.
   */
  static async findNearbySimilar(
    lat: number,
    lng: number,
    incidentTypeId: string,
    radiusMeters: number = 150,
    hoursBack: number = 48
  ): Promise<any[]> {
    const query = `
      SELECT r.id, r.description, r.status, r.created_at,
             ST_AsGeoJSON(r.location)::json as location,
             ST_Distance(r.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters,
             it.name as incident_type_name
      FROM reports r
      LEFT JOIN incident_types it ON r.incident_type_id = it.id
      WHERE r.incident_type_id = $3
        AND r.status IN ('${REPORT_STATUS.PENDING}', '${REPORT_STATUS.CONFIRMED}')
        AND r.created_at >= NOW() - ($4::text || ' hours')::interval
        AND ST_DWithin(r.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $5)
      ORDER BY distance_meters ASC
      LIMIT 5
    `;
    const result = await pool.query(query, [lng, lat, incidentTypeId, hoursBack, radiusMeters]);
    return result.rows;
  }
}
