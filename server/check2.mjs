import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'safepath',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const res = await pool.query(`
  SELECT id, email, role, is_verified, failed_login_attempts, banned_until,
         verification_token IS NOT NULL AS has_token,
         verification_otp IS NOT NULL AS has_otp,
         reset_token IS NOT NULL AS has_reset_token
  FROM users
  ORDER BY role, email
`);
console.table(res.rows);

await pool.end();
