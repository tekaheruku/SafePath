const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'safepath',
        password: 'postgres',
        port: 5432,
    });
    
    try {
        const rand = Math.random().toString(36).substring(7);
        const email = `test_${rand}@example.com`;
        const hashedPassword = await bcrypt.hash('password', 10);
        await pool.query('INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3)', [email, hashedPassword, email]);
        
        const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password:'password'})
        });
        const login = await loginRes.json();
        
        let token = login.data?.token || login.token;
        console.log("USING TOKEN:", token);

        const res = await fetch('http://localhost:3001/api/v1/reports', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'Car crash',
                severity_level: 'medium',
                description: 'Test crash',
                location: { latitude: 15.3, longitude: 120 }
            })
        });
        const data = await res.json();
        console.log('STATUS:', res.status, 'DATA:', JSON.stringify(data, null, 2));
    } catch(e) {
        console.error('ERROR:', e);
    } finally {
        await pool.end();
    }
})();
