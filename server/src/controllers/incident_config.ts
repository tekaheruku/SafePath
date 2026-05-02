import { Request, Response } from 'express';
import { db } from '../config/knex.js';

export class IncidentConfigController {
  static async getIncidentTypes(req: Request, res: Response) {
    try {
      const types = await db('incident_types').orderBy('created_at', 'asc');
      res.json(types);
    } catch (error) {
      console.error('Error fetching incident types:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getSeverityLevels(req: Request, res: Response) {
    try {
      const levels = await db('severity_levels').orderBy('level', 'asc');
      res.json(levels);
    } catch (error) {
      console.error('Error fetching severity levels:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRatingCategories(req: Request, res: Response) {
    try {
      const categories = await db('rating_categories').orderBy('created_at', 'asc');
      res.json(categories);
    } catch (error) {
      console.error('Error fetching rating categories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
