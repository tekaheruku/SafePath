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
    verificationMethod: Joi.string().valid('link', 'otp').default('link'),
});
const emailSchema = Joi.object({
    email: Joi.string().email().required(),
    verificationMethod: Joi.string().valid('link', 'otp').optional(),
});
const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
});
const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).required(),
});
export class AuthController {
    static async login(req, res) {
        try {
            // NOTE: Never log req.body on auth endpoints — it contains plaintext passwords.
            const { email, password } = validateSync(loginSchema, req.body);
            const result = await AuthService.login(email, password);
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
            res.json({ success: true, data: result });
        }
        catch (err) {
            // Only log the error message, never the credentials.
            console.error('[AuthController] login failed:', err.message);
            res.status(401).json({ success: false, error: { message: err.message } });
        }
    }
    static async register(req, res) {
        try {
            const data = validateSync(registerSchema, req.body);
            const result = await AuthService.register(data);
            res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
    static async verifyEmail(req, res) {
        try {
            const token = req.query.token;
            if (!token) {
                return res.status(400).json({ success: false, error: { message: 'Verification token is required.' } });
            }
            const result = await AuthService.verifyEmail(token);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
    static async resendVerification(req, res) {
        try {
            const { email, verificationMethod } = validateSync(emailSchema, req.body);
            const result = await AuthService.resendVerification(email, verificationMethod);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
    static async verifyEmailOtp(req, res) {
        try {
            const { email, otp } = validateSync(verifyOtpSchema, req.body);
            const result = await AuthService.verifyEmailOtp(email, otp);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
    static async requestPasswordReset(req, res) {
        try {
            const { email } = validateSync(emailSchema, req.body);
            await AuthService.requestPasswordReset(email);
            // Always return 200 to prevent email enumeration
            res.json({ success: true, data: { sent: true } });
        }
        catch (err) {
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
    static async resetPassword(req, res) {
        try {
            const { token, password } = validateSync(resetPasswordSchema, req.body);
            await AuthService.resetPassword(token, password);
            res.json({ success: true, data: { message: 'Password reset successfully.' } });
        }
        catch (err) {
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
    static async getCurrentUser(req, res) {
        try {
            const user = await AuthService.getUserById(req.user.id);
            res.json({ success: true, data: user });
        }
        catch (err) {
            res.status(404).json({ success: false, error: { message: err.message } });
        }
    }
    static async toggle2fa(req, res) {
        try {
            const { enable } = req.body;
            const result = await AuthService.toggle2fa(req.user.id, enable);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
    static async changePassword(req, res) {
        try {
            // oldPassword can be optional if 2FA OTP is provided and verified inside the service, but usually we require both or either.
            const { oldPassword, newPassword, otpToken } = req.body;
            const result = await AuthService.changePassword(req.user.id, oldPassword, newPassword, otpToken);
            res.json({ success: true, data: result });
        }
        catch (err) {
            // Sending back 400 or 403 depending on error
            res.status(400).json({ success: false, error: { message: err.message } });
        }
    }
}
