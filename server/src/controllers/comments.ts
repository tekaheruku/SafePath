/**
 * Comments Controller
 * Handles report comment thread endpoints: create, list, delete, vote, and AI-assisted flagging
 */

import { Request, Response } from 'express';
import { CommentService } from '../services/comment.js';
import { CommentVoteService } from '../services/comment-vote.js';
import { CommentModerationService } from '../services/comment-moderation.js';
import { createCommentSchema, validateSync } from '@safepath/shared/validators';
import { SocketEventBroadcaster } from '../utils/socket-broadcaster.js';

export class CommentController {
  /**
   * POST /api/v1/reports/:id/comments
   */
  static async createComment(req: Request, res: Response): Promise<void> {
    try {
      const data = validateSync(createCommentSchema, req.body);
      const comment = await CommentService.createComment(req.params.id, req.user.id, data);

      SocketEventBroadcaster.broadcastNewComment(req.params.id, comment);

      // Score for guideline violations in the background so it never delays posting.
      if (comment.content) {
        CommentModerationService.checkComment(comment.content)
          .then(async ({ violates, reason }) => {
            if (!violates) return;
            const flagged = await CommentService.flagComment(comment.id, true, reason);
            if (flagged) SocketEventBroadcaster.broadcastNewComment(req.params.id, flagged);
          })
          .catch((error) => console.error('Failed to moderate comment:', error));
      }

      res.status(201).json({
        success: true,
        data: comment,
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
   * GET /api/v1/reports/:id/comments
   */
  static async listComments(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = (req as any).user?.id;
      const comments = await CommentService.listComments(req.params.id, currentUserId);
      res.json({
        success: true,
        data: comments,
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
   * DELETE /api/v1/comments/:id
   */
  static async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      const { report_id } = await CommentService.deleteComment(req.params.id, req.user.id, (req.user as any).role);
      SocketEventBroadcaster.broadcastCommentDelete(report_id, req.params.id);

      res.json({
        success: true,
        data: { message: 'Comment deleted' },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: req.id,
      });
    }
  }

  /**
   * POST /api/v1/comments/:id/vote
   */
  static async castVote(req: Request, res: Response): Promise<void> {
    try {
      const { voteType } = req.body;
      if (voteType !== 'up' && voteType !== 'down') {
        throw new Error('Invalid vote type');
      }

      await CommentVoteService.castVote(req.params.id, req.user.id, voteType);
      const comment = await CommentService.getCommentById(req.params.id, req.user.id);
      if (comment) SocketEventBroadcaster.broadcastNewComment(comment.report_id, comment);

      res.json({
        success: true,
        data: comment,
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
   * POST /api/v1/comments/:id/report
   * User-flagged AI moderation check — never deletes automatically, only surfaces
   * a flag + reason to admins reviewing the report's comment thread.
   */
  static async reportComment(req: Request, res: Response): Promise<void> {
    try {
      const comment = await CommentService.getCommentById(req.params.id);
      if (!comment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Comment not found' },
          timestamp: new Date().toISOString(),
          request_id: req.id,
        });
        return;
      }

      const { violates, reason } = await CommentModerationService.checkComment(comment.content || '');
      const updated = violates ? await CommentService.flagComment(comment.id, true, reason) : comment;
      if (violates && updated) {
        SocketEventBroadcaster.broadcastNewComment(updated.report_id, updated);
      }

      res.json({
        success: true,
        data: { message: 'Thanks — we reviewed this comment.' },
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
