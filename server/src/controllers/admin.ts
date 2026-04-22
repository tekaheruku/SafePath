import { Request, Response } from 'express';
import { AuthService } from '../services/auth.js';
import { pool } from '../config/database.js';

export class AdminController {
  static async listUsers(req: Request, res: Response) {
    try {
      const query = `
        SELECT 
          u.id, u.email, u.name, u.role, u.created_at, u.banned_until, u.ban_reason,
          COUNT(DISTINCT r.id) as reports_count,
          COUNT(DISTINCT sr.id) as ratings_count
        FROM users u
        LEFT JOIN reports r ON u.id = r.user_id
        LEFT JOIN street_ratings sr ON u.id = sr.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `;
      const result = await pool.query(query);
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      console.error('List users error:', err.message);
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async banUser(req: any, res: Response) {
    try {
      const { userId } = req.params;
      const { duration, reason } = req.body;
      const adminRole = req.user.role;

      // Check if target user is not 'user' role
      const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (targetUserResult.rowCount === 0) return res.status(404).json({ success: false, error: { message: 'User not found' } });
      const targetRole = targetUserResult.rows[0].role;

      if (adminRole === 'lgu_admin' && targetRole !== 'user') {
        return res.status(403).json({ success: false, error: { message: 'LGU Admins can only ban regular users' } });
      }

      let bannedUntil = null;
      if (duration > 0) {
        bannedUntil = new Date();
        bannedUntil.setHours(bannedUntil.getHours() + duration);
      } else {
        bannedUntil = new Date('9999-12-31T23:59:59Z');
      }

      await pool.query(
        'UPDATE users SET banned_until = $1, ban_reason = $2 WHERE id = $3',
        [bannedUntil, reason, userId]
      );

      res.json({ success: true, message: 'User banned successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async unbanUser(req: any, res: Response) {
    try {
      const { userId } = req.params;
      const adminRole = req.user.role;

      const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (targetUserResult.rowCount === 0) return res.status(404).json({ success: false, error: { message: 'User not found' } });
      const targetRole = targetUserResult.rows[0].role;

      if (adminRole === 'lgu_admin' && targetRole !== 'user') {
        return res.status(403).json({ success: false, error: { message: 'LGU Admins can only unban regular users' } });
      }

      await pool.query(
        'UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE id = $1',
        [userId]
      );
      res.json({ success: true, message: 'User unbanned successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async deleteUser(req: any, res: Response) {
    try {
      const { userId } = req.params;
      const adminRole = req.user.role;

      const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (targetUserResult.rowCount === 0) return res.status(404).json({ success: false, error: { message: 'User not found' } });
      const targetRole = targetUserResult.rows[0].role;

      if (adminRole === 'lgu_admin' && targetRole !== 'user') {
        return res.status(403).json({ success: false, error: { message: 'LGU Admins can only delete regular users' } });
      }

      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
}

export class AdminRequestsController {
  static async submitRequest(req: any, res: Response) {
    try {
      const { email, name, requestedRole, reason } = req.body;

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email) || !name || !requestedRole) {
        return res.status(400).json({ success: false, message: 'Invalid data submitted' });
      }

      if (requestedRole !== 'lgu_admin' && requestedRole !== 'superadmin') {
        return res.status(400).json({ success: false, message: 'Invalid role requested' });
      }

      let document_url = null;

      if (req.file) {
        const { supabase } = require('./upload.js');
        const path = require('path');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = 'admin-docs/' + uniqueSuffix + path.extname(req.file.originalname);

        const { error } = await supabase.storage
          .from('uploads')
          .upload(filename, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (error) {
          console.error('Supabase doc upload error:', error);
          return res.status(500).json({ success: false, message: 'Failed to upload verification document' });
        }

        const { data: publicUrlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filename);

        document_url = publicUrlData.publicUrl;
      }

      await pool.query(
        'INSERT INTO admin_requests (email, name, requested_role, reason, status, document_url) VALUES ($1, $2, $3, $4, $5, $6)',
        [email, name, requestedRole, reason || null, 'pending', document_url]
      );

      res.json({ success: true, message: 'Request submitted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async listRequests(req: any, res: Response) {
    try {
      const result = await pool.query('SELECT * FROM admin_requests ORDER BY created_at DESC');
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async approveRequest(req: any, res: Response) {
    try {
      const { requestId } = req.params;
      const requestResult = await pool.query('SELECT * FROM admin_requests WHERE id = $1 AND status = $2', [requestId, 'pending']);

      if (requestResult.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Pending request not found' });
      }

      const adminReq = requestResult.rows[0];

      // Auto-generate a dummy user account, skip email verification.
      const tempPass = Math.floor(10000000 + Math.random() * 90000000).toString();
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(tempPass, 10);

      // Check if user already exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [adminReq.email]);

      if (existingUser.rowCount > 0) {
        await pool.query('UPDATE users SET role = $1 WHERE email = $2', [adminReq.requested_role, adminReq.email]);
      } else {
        await pool.query(
          'INSERT INTO users (email, password_hash, name, role, is_verified) VALUES ($1, $2, $3, $4, true)',
          [adminReq.email, hash, adminReq.name, adminReq.requested_role]
        );
      }

      await pool.query('UPDATE admin_requests SET status = $1 WHERE id = $2', ['approved', requestId]);

      // Fire a password reset so they can set their own password immediately
      const { AuthService } = require('../services/auth.js');
      await AuthService.requestPasswordReset(adminReq.email);

      res.json({ success: true, message: 'Request approved successfully. A password reset email was sent to the user.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async rejectRequest(req: any, res: Response) {
    try {
      const { requestId } = req.params;
      await pool.query('UPDATE admin_requests SET status = $1 WHERE id = $2', ['rejected', requestId]);
      res.json({ success: true, message: 'Request rejected' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
}
