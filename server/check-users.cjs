const pg = require('pg');
const { Pool } = pg;

(async () => {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'safepath',
        password: 'OPOLOCOTERU14',
        port: 5432,
    });
    try {
        await pool.query("UPDATE users SET role = 'superadmin' WHERE email = 'tripletwo1111@gmail.com'");
        await pool.query("UPDATE users SET role = 'lgu_admin' WHERE email = 'davevaldez100@gmail.com'");
        
        const res = await pool.query('SELECT email, role, name FROM users');
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
})();
