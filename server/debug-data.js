import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'safepath',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});
async function checkData() {
    try {
        const reports = await pool.query('SELECT COUNT(*) as count, ST_AsGeoJSON(ST_Extent(location::geometry)) as ext FROM reports');
        console.log('REPORTS:', reports.rows[0]);
        const ratings = await pool.query('SELECT COUNT(*) as count, ST_AsGeoJSON(ST_Extent(location::geometry)) as ext FROM street_ratings');
        console.log('RATINGS:', ratings.rows[0]);
        const sample = await pool.query('SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat FROM reports LIMIT 5');
        console.log('SAMPLE REPORTS:', sample.rows);
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkData();
