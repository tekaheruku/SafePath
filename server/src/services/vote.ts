import { pool } from '../config/database.js';
import { VoteType } from '@safepath/shared';

export class VoteService {
  /**
   * Cast or update a vote on a report
   */
  static async castVote(reportId: string, userId: string, voteType: VoteType): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check for existing vote
      const existingVote = await client.query(
        'SELECT vote_type FROM report_votes WHERE report_id = $1 AND user_id = $2',
        [reportId, userId]
      );

      if (existingVote.rows.length > 0) {
        const currentType = existingVote.rows[0].vote_type;
        
        if (currentType === voteType) {
          // Remove vote if clicking the same button
          await client.query(
            'DELETE FROM report_votes WHERE report_id = $1 AND user_id = $2',
            [reportId, userId]
          );
          
          const countCol = voteType === 'up' ? 'upvotes_count' : 'downvotes_count';
          await client.query(
            `UPDATE reports SET ${countCol} = GREATEST(0, ${countCol} - 1) WHERE id = $1`,
            [reportId]
          );
        } else {
          // Switch vote type
          await client.query(
            'UPDATE report_votes SET vote_type = $1, updated_at = NOW() WHERE report_id = $2 AND user_id = $3',
            [voteType, reportId, userId]
          );

          if (voteType === 'up') {
            await client.query(
              'UPDATE reports SET upvotes_count = upvotes_count + 1, downvotes_count = GREATEST(0, downvotes_count - 1) WHERE id = $1',
              [reportId]
            );
          } else {
            await client.query(
              'UPDATE reports SET downvotes_count = downvotes_count + 1, upvotes_count = GREATEST(0, upvotes_count - 1) WHERE id = $1',
              [reportId]
            );
          }
        }
      } else {
        // New vote
        await client.query(
          'INSERT INTO report_votes (report_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [reportId, userId, voteType]
        );

        const countCol = voteType === 'up' ? 'upvotes_count' : 'downvotes_count';
        await client.query(
          `UPDATE reports SET ${countCol} = ${countCol} + 1 WHERE id = $1`,
          [reportId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get vote counts for a report
   */
  static async getVoteCounts(reportId: string): Promise<{ up: number; down: number }> {
    const result = await pool.query(
      'SELECT upvotes_count, downvotes_count FROM reports WHERE id = $1',
      [reportId]
    );
    if (result.rows.length === 0) throw new Error('Report not found');
    return {
      up: result.rows[0].upvotes_count,
      down: result.rows[0].downvotes_count
    };
  }
}
