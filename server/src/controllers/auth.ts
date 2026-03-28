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

  static async getCurrentUser(req: any, res: Response) {
    try {
      const user = await AuthService.getUserById(req.user.id);
      res.json({ success: true, data: user });
    } catch (err: any) {
      res.status(404).json({ success: false, error: { message: err.message } });
    }
  }
}
