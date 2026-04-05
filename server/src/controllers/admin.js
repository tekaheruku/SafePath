import { pool } from '../config/database.js';
export class AdminController {
    static async listUsers(req, res) {
        try {
            const query = `
        SELECT 
          u.id, u.email, u.name, u.role, u.created_at, u.banned_until, u.ban_reason,
          COUNT(DISTINCT r.id) as reports_count,
          COUNT(DISTINCT sr.id) as ratings_count
        FROM users u
        LEFT JOIN reports r ON u.id = r.user_id
        LEFT JOIN street_ratings sr ON u.id = sr.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `;
            const result = await pool.query(query);
            res.json({ success: true, data: result.rows });
        }
        catch (err) {
            console.error('List users error:', err.message);
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    }
    static async banUser(req, res) {
        try {
            const { userId } = req.params;
            const { duration, reason } = req.body;
            const adminRole = req.user.role;
            // Check if target user is not 'user' role
            const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
            if (targetUserResult.rowCount === 0)
                return res.status(404).json({ success: false, error: { message: 'User not found' } });
            const targetRole = targetUserResult.rows[0].role;
            if (adminRole === 'lgu_admin' && targetRole !== 'user') {
                return res.status(403).json({ success: false, error: { message: 'LGU Admins can only ban regular users' } });
            }
            let bannedUntil = null;
            if (duration > 0) {
                bannedUntil = new Date();
                bannedUntil.setHours(bannedUntil.getHours() + duration);
            }
            else {
                bannedUntil = new Date('9999-12-31T23:59:59Z');
            }
            await pool.query('UPDATE users SET banned_until = $1, ban_reason = $2 WHERE id = $3', [bannedUntil, reason, userId]);
            res.json({ success: true, message: 'User banned successfully' });
        }
        catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    }
    static async unbanUser(req, res) {
        try {
            const { userId } = req.params;
            const adminRole = req.user.role;
            const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
            if (targetUserResult.rowCount === 0)
                return res.status(404).json({ success: false, error: { message: 'User not found' } });
            const targetRole = targetUserResult.rows[0].role;
            if (adminRole === 'lgu_admin' && targetRole !== 'user') {
                return res.status(403).json({ success: false, error: { message: 'LGU Admins can only unban regular users' } });
            }
            await pool.query('UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE id = $1', [userId]);
            res.json({ success: true, message: 'User unbanned successfully' });
        }
        catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    }
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const adminRole = req.user.role;
            const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
            if (targetUserResult.rowCount === 0)
                return res.status(404).json({ success: false, error: { message: 'User not found' } });
            const targetRole = targetUserResult.rows[0].role;
            if (adminRole === 'lgu_admin' && targetRole !== 'user') {
                return res.status(403).json({ success: false, error: { message: 'LGU Admins can only delete regular users' } });
            }
            await pool.query('DELETE FROM users WHERE id = $1', [userId]);
            res.json({ success: true, message: 'User deleted successfully' });
        }
        catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    }
}
