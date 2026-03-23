import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:OPOLOCOTERU14@localhost:5432/safepath' });
pool.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'reports_severity_level_check'").then(r => {
    console.log("CONSTRAINT:", r.rows);
    process.exit(0);
});
