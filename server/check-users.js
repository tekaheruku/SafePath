const { Pool } = require('pg');

(async () => {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'safepath',
        password: 'postgres',
        port: 5432,
    });
    try {
        const res = await pool.query('SELECT id, email, role, name FROM users');
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
})();
