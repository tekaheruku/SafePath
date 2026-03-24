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

    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async register(data: any) {
    const { email, password, name } = data;
    
    // Profanity Filter for Name (English & Tagalog)
    const vulgarWords = [
      'tanga', 'gago', 'puta', 'pota', 'putangina', 'pokpok', 'bayot', 'bakla', 'kupal', 'ulol', 'buwisit', 'pucha',
      'fuck', 'shit', 'asshole', 'bitch', 'dick', 'pussy', 'bastard', 'cunt'
    ]; 
    const nameLower = name.toLowerCase();
    if (vulgarWords.some(word => nameLower.includes(word))) {
      throw new Error('Name contains inappropriate language');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'user']
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
