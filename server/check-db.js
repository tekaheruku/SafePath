import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Uses environment variables from server/.env — never hardcode credentials here.
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'safepath',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

pool.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'reports_severity_level_check'").then(r => {
    console.log("CONSTRAINT:", r.rows);
    process.exit(0);
});
