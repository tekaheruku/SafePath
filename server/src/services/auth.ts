import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

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
      throw new Error('Invalid email or password');
    }

    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return { 
        banned: true, 
        bannedUntil: user.banned_until, 
        banReason: user.ban_reason 
      };
    }

    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
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
    const { email, password, name } = data;
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
      // Slurs (Aggressive n-word variations)
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

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, trimmedName, 'user']
    );
    
    const user = result.rows[0];
    const token = this.generateToken(user);
    return { user, token };
  }

  static async getUserById(id: string) {
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) throw new Error('User not found');
    return result.rows[0];
  }

  private static generateToken(user: any) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
}
