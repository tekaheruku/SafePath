import bcrypt from 'bcryptjs';
export async function seed(knex) {
    // Deletes ALL existing entries
    await knex('users').del();
    const hashedPassword = await bcrypt.hash('password123', 10);
    // Inserts seed entries
    await knex('users').insert([
        {
            id: 'f88ef8b0-8e5c-4b5a-9b1a-1a2b3c4d5e6f',
            email: 'admin@safepath.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'lgu_admin'
        },
        {
            id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
            email: 'user1@safepath.com',
            password: hashedPassword,
            name: 'John Doe',
            role: 'user'
        },
        {
            id: 'b2c3d4e5-f6a1-42b3-93c4-0d1e2f3a4b5c',
            email: 'user2@safepath.com',
            password: hashedPassword,
            name: 'Jane Smith',
            role: 'user'
        }
    ]);
}
;
