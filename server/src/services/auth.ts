import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/database.js';
import { EmailService } from './email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'safepath-secret-key-change-it';

export class AuthService {
  static async login(email: string, password: string) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      await pool.query('UPDATE users SET failed_login_attempts = $1 WHERE id = $2', [newAttempts, user.id]);

      if (newAttempts === 3) {
        // Bug 3 fix: send a password-reset OTP, not a verification link.
        // The user most likely forgot their password. Fire-and-forget so timing
        // doesn't reveal whether the account exists.
        AuthService.requestPasswordReset(email).catch((err) => {
          console.error('[AuthService] Failed to send password reset on repeated failed logins:', err.message);
        });
        throw new Error('Too many failed login attempts. A password reset code has been sent to your email — check your inbox.');
      } else if (newAttempts > 3) {
        throw new Error('Too many failed attempts. Please check your email for the password reset code sent earlier.');
      }

      throw new Error('Invalid email or password');
    }

    // Bug 2 fix: enforce email verification gate before issuing a JWT.
    // Admin roles (superadmin, lgu_admin, admin) are created manually and bypass
    // the email gate — they also pre-date migration 011 (is_verified defaults false).
    const ADMIN_ROLES = (process.env.ADMIN_ROLES || 'superadmin,lgu_admin,admin').split(',');
    if (!user.is_verified && !ADMIN_ROLES.includes(user.role)) {
      throw new Error('Please verify your email address before signing in. Check your inbox or resend the verification email.');
    }

    if (user.failed_login_attempts > 0) {
      await pool.query('UPDATE users SET failed_login_attempts = 0 WHERE id = $1', [user.id]);
    }

    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return { 
        banned: true, 
        bannedUntil: user.banned_until, 
        banReason: user.ban_reason 
      };
    }

    const token = this.generateToken(user);
    const { password_hash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      // Replace common leetspeak
      .replace(/0/g, 'o')
      .replace(/[1!|l]/g, 'i')
      .replace(/3/g, 'e')
      .replace(/[4@^]/g, 'a')
      .replace(/[5$]/g, 's')
      .replace(/[69]/g, 'g')
      .replace(/[7+]/g, 't')
      .replace(/8/g, 'b')
      .replace(/2/g, 'z')
      // Remove all non-alphabetic characters
      .replace(/[^a-z]/g, '');
  }

  static async register(data: any) {
    const { email, password, name, verificationMethod = 'link' } = data;
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 3) {
      throw new Error('Name must be at least 3 characters long and cannot be just whitespace.');
    }

    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
      throw new Error('Name can only contain letters and spaces (no numbers or symbols).');
    }
    
    // Expanded Profanity Filter (English, Tagalog, and Slurs)
    const vulgarWords = [
      // Tagalog
      'tanga', 'gago', 'puta', 'pota', 'putangina', 'pokpok', 'bayot', 'bakla', 'kupal', 'ulol', 'buwisit', 'pucha',
      'kantot', 'iyot', 'burat', 'pekpek', 'puke', 'dede', 'salsal', 'jakol', 'etits',
      // English
      'fuck', 'shit', 'asshole', 'bitch', 'dick', 'pussy', 'bastard', 'cunt', 'cock', 'faggot', 'whore', 'slut',
      // Slurs
      'nigger', 'nigga', 'nigur', 'nigor', 'niga', 'niggah', 'nigg3r', 'nigg4', 'n*gger', 'n.i.g.g.e.r',
      'kike', 'chink', 'spic', 'negro', 'necro'
    ]; 

    const nameLower = trimmedName.toLowerCase();
    const nameNormalized = this.normalizeText(trimmedName);

    const isVulgar = vulgarWords.some(word => 
      nameLower.includes(word) || 
      nameNormalized.includes(word)
    );

    if (isVulgar) {
      throw new Error('Name contains inappropriate language. Please use a professional name.');
    }

    // Check if email is already registered
    const existingUser = await pool.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
    if (existingUser.rows[0]) {
      if (!existingUser.rows[0].is_verified) {
        // Resend verification for existing unverified account
        throw new Error('An account with this email already exists but is not verified. Please check your inbox or request a new verification email.');
      }
      throw new Error('An account with this email already exists.');
    }

    const method: 'link' | 'otp' = verificationMethod === 'otp' ? 'otp' : 'link';
    const hashedPassword = await bcrypt.hash(password, 10);

    let verificationToken: string | null = null;
    let verificationOtp: string | null = null;
    let verificationExpires: Date;

    if (method === 'otp') {
      verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
      verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    } else {
      verificationToken = crypto.randomBytes(32).toString('hex');
      verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_verified, verification_token, verification_token_expires, verification_otp, verification_method)
       VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8)
       RETURNING id, email, name, role`,
      [email, hashedPassword, trimmedName, 'user', verificationToken, verificationExpires, verificationOtp, method]
    );

    const user = result.rows[0];

    // Fire-and-forget so a transient SMTP error never blocks registration.
    if (method === 'otp') {
      EmailService.sendVerificationOtpEmail(email, verificationOtp!).catch((err) => {
        console.error('[AuthService] Failed to send OTP verification email on register:', err.message);
      });
    } else {
      EmailService.sendVerificationEmail(email, verificationToken!).catch((err) => {
        console.error('[AuthService] Failed to send verification email on register:', err.message);
      });
    }

    return { pending: true, email: user.email, method };
  }

  static async verifyEmail(token: string) {
    if (!token) throw new Error('Verification token is required.');

    const result = await pool.query(
      'SELECT * FROM users WHERE verification_token = $1',
      [token]
    );
    const user = result.rows[0];

    if (!user) {
      throw new Error('Invalid or expired verification link.');
    }

    if (new Date(user.verification_token_expires) < new Date()) {
      throw new Error('This verification link has expired. Please request a new one.');
    }

    if (user.is_verified) {
      // Already verified — just log them in
      const jwtToken = this.generateToken(user);
      const { password_hash: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token: jwtToken };
    }

    await pool.query(
      `UPDATE users
       SET is_verified = true, verification_token = NULL, verification_token_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    const updatedResult = await pool.query(
      'SELECT id, email, name, role, is_verified FROM users WHERE id = $1',
      [user.id]
    );
    const updatedUser = updatedResult.rows[0];
    const jwtToken = this.generateToken(updatedUser);
    return { user: updatedUser, token: jwtToken };
  }

  static async resendVerification(email: string, verificationMethod?: string) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Always return success to prevent email enumeration
    if (!user || user.is_verified) return { sent: true };

    // Server-side rate limit — derive issue time from the stored expiry.
    if (user.verification_token_expires) {
      // OTP expires in 15 min, link expires in 24 h
      const expiryMs = new Date(user.verification_token_expires).getTime();
      const durationMs = user.verification_method === 'otp' ? 15 * 60 * 1_000 : 24 * 60 * 60 * 1_000;
      const tokenIssuedAt = expiryMs - durationMs;
      const secondsSinceIssue = (Date.now() - tokenIssuedAt) / 1_000;
      const cooldownSecs = parseInt(process.env.VERIFICATION_RESEND_COOLDOWN || '60');
      if (secondsSinceIssue < cooldownSecs) {
        throw new Error(`Please wait ${Math.ceil(cooldownSecs - secondsSinceIssue)} seconds before requesting another verification email.`);
      }
    }

    // Allow switching method on resend, or default to existing method.
    const method: 'link' | 'otp' = (verificationMethod === 'otp' || (!verificationMethod && user.verification_method === 'otp')) ? 'otp' : 'link';

    let verificationToken: string | null = null;
    let verificationOtp: string | null = null;
    let verificationExpires: Date;

    if (method === 'otp') {
      verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
      verificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    } else {
      verificationToken = crypto.randomBytes(32).toString('hex');
      verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await pool.query(
      `UPDATE users
       SET verification_token = $1, verification_token_expires = $2,
           verification_otp = $3, verification_method = $4
       WHERE id = $5`,
      [verificationToken, verificationExpires, verificationOtp, method, user.id]
    );

    if (method === 'otp') {
      EmailService.sendVerificationOtpEmail(email, verificationOtp!).catch((err) => {
        console.error('Failed to resend OTP verification email:', err.message);
      });
    } else {
      EmailService.sendVerificationEmail(email, verificationToken!).catch((err) => {
        console.error('Failed to resend verification email:', err.message);
      });
    }

    return { sent: true, method };
  }

  static async verifyEmailOtp(email: string, otp: string) {
    if (!email || !otp) throw new Error('Email and OTP code are required.');

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) throw new Error('No account found with this email address.');
    if (user.is_verified) {
      // Already verified — just log them in
      const jwtToken = this.generateToken(user);
      const { password_hash: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token: jwtToken };
    }

    if (user.verification_method !== 'otp') {
      throw new Error('This account uses link-based verification. Please click the link in your email.');
    }

    if (!user.verification_otp || user.verification_otp !== otp.trim()) {
      throw new Error('Invalid verification code.');
    }

    if (new Date(user.verification_token_expires) < new Date()) {
      throw new Error('This code has expired. Please request a new one.');
    }

    await pool.query(
      `UPDATE users
       SET is_verified = true, verification_otp = NULL, verification_token = NULL, verification_token_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    const updatedResult = await pool.query(
      'SELECT id, email, name, role, is_verified FROM users WHERE id = $1',
      [user.id]
    );
    const updatedUser = updatedResult.rows[0];
    const jwtToken = this.generateToken(updatedUser);
    return { user: updatedUser, token: jwtToken };
  }

  static async requestPasswordReset(email: string) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Always return success to prevent email enumeration
    if (!user) return { sent: true };

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
      [resetOtp, resetExpires, user.id]
    );

    EmailService.sendPasswordResetEmail(email, resetOtp).catch((err) => {
      console.error('Failed to send password reset email:', err.message);
    });

    return { sent: true };
  }

  static async resetPassword(token: string, newPassword: string) {
    if (!token) throw new Error('Reset token is required.');
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1',
      [token]
    );
    const user = result.rows[0];

    if (!user) throw new Error('Invalid or expired password reset link.');

    if (new Date(user.reset_token_expires) < new Date()) {
      throw new Error('This password reset link has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    return { success: true };
  }

  static async toggle2fa(userId: string, enable: boolean) {
    if (typeof enable !== 'boolean') {
      throw new Error('Invalid input');
    }
    await pool.query(
      `UPDATE users SET two_factor_enabled = $1 WHERE id = $2`,
      [enable, userId]
    );
    return { enabled: enable };
  }

  static async changePassword(userId: string, oldPassword?: string, newPassword?: string, otpToken?: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) throw new Error('User not found.');

    // If 2FA is enabled, they must use the OTP flow correctly.
    if (user.two_factor_enabled) {
      if (!otpToken) {
        throw new Error('Two-Factor Authentication is enabled. An OTP code is required to change your password.');
      }
      
      // If OTP token is provided, verify it. 
      // Assuming they requested it via the requestPasswordReset mechanism and we check reset_token
      if (user.reset_token !== otpToken) {
         throw new Error('Invalid OTP code.');
      }
      if (new Date(user.reset_token_expires) < new Date()) {
         throw new Error('This OTP code has expired. Please request a new one.');
      }
      
      // Clear OTP
      await pool.query(
        `UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1`,
        [user.id]
      );
    } else {
      // 2FA not enabled, check old password
      if (!oldPassword) {
        throw new Error('Current password is required.');
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isMatch) {
         throw new Error('Current password is incorrect.');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [hashedPassword, user.id]
    );

    return { message: 'Password updated successfully.' };
  }

  static async getUserById(id: string) {
    const result = await pool.query('SELECT id, email, name, role, two_factor_enabled FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) throw new Error('User not found');
    return result.rows[0];
  }

  private static generateToken(user: any) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, two_factor_enabled: user.two_factor_enabled },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
}
