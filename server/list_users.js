import { db } from './src/config/knex.ts';
async function listUsers() {
    try {
        const users = await db('users').select('id', 'email', 'name', 'role', 'is_verified');
        console.log('--- Current Users ---');
        console.table(users);
        process.exit(0);
    }
    catch (err) {
        console.error('Error fetching users:', err.message);
        process.exit(1);
    }
}
listUsers();
