import { pool } from '../config/database.js';
import { ADMIN_ROLES } from '@safepath/shared';

export class CommentService {
  static async createComment(reportId: string, userId: string, data: { content?: string | null; photo_url?: string | null }): Promise<any> {
    const query = `
      INSERT INTO report_comments (report_id, user_id, content, photo_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, report_id, user_id, content, photo_url, upvotes_count, downvotes_count, ai_flagged, ai_flag_reason, created_at, updated_at
    `;
    const result = await pool.query(query, [reportId, userId, data.content || null, data.photo_url || null]);
    return CommentService.getCommentById(result.rows[0].id);
  }

  static async listComments(reportId: string, currentUserId?: string): Promise<any[]> {
    const query = `
      SELECT c.id, c.report_id, c.user_id, c.content, c.photo_url, c.upvotes_count, c.downvotes_count,
             c.ai_flagged, c.ai_flag_reason, c.created_at, c.updated_at,
             u.name as author_name
             ${currentUserId ? `, (SELECT vote_type FROM report_comment_votes WHERE comment_id = c.id AND user_id = $2) as user_vote` : ''}
      FROM report_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.report_id = $1
      ORDER BY c.created_at ASC
    `;
    const params = currentUserId ? [reportId, currentUserId] : [reportId];
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getCommentById(id: string, currentUserId?: string): Promise<any | null> {
    const query = `
      SELECT c.id, c.report_id, c.user_id, c.content, c.photo_url, c.upvotes_count, c.downvotes_count,
             c.ai_flagged, c.ai_flag_reason, c.created_at, c.updated_at,
             u.name as author_name
             ${currentUserId ? `, (SELECT vote_type FROM report_comment_votes WHERE comment_id = c.id AND user_id = $2) as user_vote` : ''}
      FROM report_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const params = currentUserId ? [id, currentUserId] : [id];
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  static async deleteComment(id: string, userId: string, userRole: string): Promise<{ report_id: string }> {
    const isAdmin = ADMIN_ROLES.includes(userRole as any);

    let query: string;
    let params: any[];
    if (isAdmin) {
      query = 'DELETE FROM report_comments WHERE id = $1 RETURNING report_id';
      params = [id];
    } else {
      query = 'DELETE FROM report_comments WHERE id = $1 AND user_id = $2 RETURNING report_id';
      params = [id, userId];
    }

    const result = await pool.query(query, params);
    if (result.rowCount === 0) throw new Error('Comment not found or Unauthorized');
    return result.rows[0];
  }

  static async flagComment(id: string, aiFlagged: boolean, reason: string | null): Promise<any | null> {
    const result = await pool.query(
      `UPDATE report_comments SET ai_flagged = $1, ai_flag_reason = $2, updated_at = NOW() WHERE id = $3
       RETURNING id, report_id, user_id, content, photo_url, upvotes_count, downvotes_count, ai_flagged, ai_flag_reason, created_at, updated_at`,
      [aiFlagged, reason, id]
    );
    return result.rows[0] || null;
  }
}
