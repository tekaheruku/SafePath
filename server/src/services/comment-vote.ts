import { pool } from '../config/database.js';
import { VoteType } from '@safepath/shared';

export class CommentVoteService {
  /**
   * Cast or update a vote on a comment (mirrors VoteService.castVote for reports)
   */
  static async castVote(commentId: string, userId: string, voteType: VoteType): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingVote = await client.query(
        'SELECT vote_type FROM report_comment_votes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );

      if (existingVote.rows.length > 0) {
        const currentType = existingVote.rows[0].vote_type;

        if (currentType === voteType) {
          await client.query(
            'DELETE FROM report_comment_votes WHERE comment_id = $1 AND user_id = $2',
            [commentId, userId]
          );

          const countCol = voteType === 'up' ? 'upvotes_count' : 'downvotes_count';
          await client.query(
            `UPDATE report_comments SET ${countCol} = GREATEST(0, ${countCol} - 1) WHERE id = $1`,
            [commentId]
          );
        } else {
          await client.query(
            'UPDATE report_comment_votes SET vote_type = $1, updated_at = NOW() WHERE comment_id = $2 AND user_id = $3',
            [voteType, commentId, userId]
          );

          if (voteType === 'up') {
            await client.query(
              'UPDATE report_comments SET upvotes_count = upvotes_count + 1, downvotes_count = GREATEST(0, downvotes_count - 1) WHERE id = $1',
              [commentId]
            );
          } else {
            await client.query(
              'UPDATE report_comments SET downvotes_count = downvotes_count + 1, upvotes_count = GREATEST(0, upvotes_count - 1) WHERE id = $1',
              [commentId]
            );
          }
        }
      } else {
        await client.query(
          'INSERT INTO report_comment_votes (comment_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [commentId, userId, voteType]
        );

        const countCol = voteType === 'up' ? 'upvotes_count' : 'downvotes_count';
        await client.query(
          `UPDATE report_comments SET ${countCol} = ${countCol} + 1 WHERE id = $1`,
          [commentId]
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
}
