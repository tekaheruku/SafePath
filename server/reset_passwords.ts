import { db } from './src/config/knex.ts';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
  try {
    const adminHash = await bcrypt.hash('B055man69', 10);
    const userHash = await bcrypt.hash('password2026bro', 10);

    // Update superadmins and lgu_admins
    const adminCount = await db('users')
      .whereIn('role', ['superadmin', 'lgu_admin'])
      .update({ password_hash: adminHash });

    // Update regular users
    const userCount = await db('users')
      .where('role', 'user')
      .update({ password_hash: userHash });

    console.log(`✅ Success!`);
    console.log(`- Updated ${adminCount} Admin accounts to password: B055man69`);
    console.log(`- Updated ${userCount} User accounts to password: password2026bro`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting passwords:', err.message);
    process.exit(1);
  }
}

resetPasswords();
