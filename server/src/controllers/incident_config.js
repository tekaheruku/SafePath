import db from '../db.js'; // Assuming db.js is at src/db.js, let's verify.
export class IncidentConfigController {
    static async getIncidentTypes(req, res) {
        try {
            const types = await db('incident_types').orderBy('created_at', 'asc');
            res.json(types);
        }
        catch (error) {
            console.error('Error fetching incident types:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getSeverityLevels(req, res) {
        try {
            const levels = await db('severity_levels').orderBy('level', 'asc');
            res.json(levels);
        }
        catch (error) {
            console.error('Error fetching severity levels:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
