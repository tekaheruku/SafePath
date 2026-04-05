import { Request, Response } from 'express';
import { AuthService } from '../services/auth.js';
import { validateSync } from '@safepath/shared/validators';
import Joi from 'joi';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().trim().min(3).pattern(/^[a-zA-Z\s]+$/).required(),
});

const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      console.log('Login request body:', req.body);
      const { email, password } = validateSync(loginSchema, req.body);
      const result: any = await AuthService.login(email, password);
      
      if (result.banned) {
        return res.status(403).json({ 
          success: false, 
          error: { 
            message: `Your account has been banned. Reason: ${result.banReason || 'None'}`,
            bannedUntil: result.bannedUntil,
            banReason: result.banReason
          } 
        });
      }

      console.log('Login successful for:', email);
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('Login controller error:', err.message);
      res.status(401).json({ success: false, error: { message: err.message } });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const data = validateSync(registerSchema, req.body);
      const result = await AuthService.register(data);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ success: false, error: { message: 'Verification token is required.' } });
      }
      const result = await AuthService.verifyEmail(token);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      const { email } = validateSync(emailSchema, req.body);
      await AuthService.resendVerification(email);
      res.json({ success: true, data: { sent: true } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = validateSync(emailSchema, req.body);
      await AuthService.requestPasswordReset(email);
      // Always return 200 to prevent email enumeration
      res.json({ success: true, data: { sent: true } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = validateSync(resetPasswordSchema, req.body);
      await AuthService.resetPassword(token, password);
      res.json({ success: true, data: { message: 'Password reset successfully.' } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async getCurrentUser(req: any, res: Response) {
    try {
      const user = await AuthService.getUserById(req.user.id);
      res.json({ success: true, data: user });
    } catch (err: any) {
      res.status(404).json({ success: false, error: { message: err.message } });
    }
  }

  static async toggle2fa(req: any, res: Response) {
    try {
      const { enable } = req.body;
      const result = await AuthService.toggle2fa(req.user.id, enable);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async changePassword(req: any, res: Response) {
    try {
      // oldPassword can be optional if 2FA OTP is provided and verified inside the service, but usually we require both or either.
      const { oldPassword, newPassword, otpToken } = req.body;
      const result = await AuthService.changePassword(req.user.id, oldPassword, newPassword, otpToken);
      res.json({ success: true, data: result });
    } catch (err: any) {
      // Sending back 400 or 403 depending on error
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
}
