import { Request, Response } from 'express';
import { ChatService } from '../services/chat.js';

export class ChatController {
  /**
   * POST /api/v1/chat/messages
   */
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { session_id, message } = req.body;
      const userId = (req as any).user?.id || null;

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MESSAGE', message: 'Message is required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const sessionId = await ChatService.getOrCreateSession(session_id, userId);
      const { reply, escalate } = await ChatService.getReply(sessionId, message.trim());

      res.json({
        success: true,
        data: { session_id: sessionId, reply, escalate },
        timestamp: new Date().toISOString(),
        request_id: (req as any).id,
      });
    } catch (error: any) {
      console.error('Error in chat sendMessage:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CHAT_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: (req as any).id,
      });
    }
  }

  /**
   * GET /api/v1/chat/sessions/:id
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const messages = await ChatService.getHistory(id);
      res.json({
        success: true,
        data: messages,
        timestamp: new Date().toISOString(),
        request_id: (req as any).id,
      });
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CHAT_HISTORY_ERROR', message: error.message },
        timestamp: new Date().toISOString(),
        request_id: (req as any).id,
      });
    }
  }
}
