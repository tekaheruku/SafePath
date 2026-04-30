import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { 
      rejectUnauthorized: false,
      servername: process.env.DB_SSL_SERVERNAME || process.env.DB_HOST
    } : false,
  };

  console.log('Attempting to connect with:');
  console.log('Host:', config.host);
  console.log('Port:', config.port);
  console.log('User:', config.user);
  console.log('SSL:', !!config.ssl);

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('🕒 Server time:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('💡 This looks like a DNS issue. The hostname could not be resolved.');
    }
  }
}

testConnection();
