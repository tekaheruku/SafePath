import { pool } from '../config/database.js';
import { ADMIN_ROLES } from '@safepath/shared';

export interface StreetRating {
  id: string;
  user_id?: string;
  lighting_score: number;
  pedestrian_safety_score: number;
  driver_safety_score: number;
  overall_safety_score: number;
  comment?: string;
  geom: any;
  created_at: Date;
  updated_at: Date;
}

export class StreetRatingService {
  /**
   * Create a new street rating
   */
  static async createRating(userId: string | undefined, data: any): Promise<StreetRating> {
    const { 
      lighting_score, 
      pedestrian_safety_score, 
      driver_safety_score, 
      overall_safety_score, 
      comment, 
      location 
    } = data;
    
    const query = `
      INSERT INTO street_ratings (
        user_id, 
        lighting_score, 
        pedestrian_safety_score, 
        driver_safety_score, 
        overall_safety_score, 
        comment, 
        location
      )
      VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326))
      RETURNING id, user_id, lighting_score, pedestrian_safety_score, driver_safety_score, 
                overall_safety_score, comment, ST_AsGeoJSON(location)::json as location, 
                created_at, updated_at
    `;
    
    const params = [
      userId || null, 
      lighting_score, 
      pedestrian_safety_score, 
      driver_safety_score, 
      overall_safety_score, 
      comment || null, 
      location.longitude, 
      location.latitude
    ];
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * List ratings with filters
   */
  static async listRatings(filters?: any, page: number = 1, limit: number = 20): Promise<any> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Geographic filter
    if (filters?.minLat !== undefined && filters?.maxLat !== undefined && filters?.minLng !== undefined && filters?.maxLng !== undefined) {
      whereClause += ` AND location && ST_MakeEnvelope($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 4326)`;
      params.push(filters.minLng, filters.minLat, filters.maxLng, filters.maxLat);
      paramIndex += 4;
    }

    // Time filter
    if (filters?.daysBack) {
      whereClause += ` AND created_at >= NOW() - ($${paramIndex}::text || ' days')::interval`;
      params.push(filters.daysBack);
      paramIndex++;
    }

    const query = `
      SELECT id, user_id, lighting_score, pedestrian_safety_score, driver_safety_score,
             overall_safety_score, comment, ST_AsGeoJSON(location)::json as location,
             created_at, updated_at
      FROM street_ratings
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Total count for pagination
    const countQuery = `SELECT COUNT(*) FROM street_ratings ${whereClause}`;
    const countResult = await pool.query(countQuery, params.slice(0, params.length - 2));

    return {
      ratings: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Delete a street rating
   */
  static async deleteRating(id: string, userId: string, userRole: string): Promise<void> {
    const isAdmin = ADMIN_ROLES.includes(userRole as any);
    
    let query: string;
    let params: any[];
    
    if (isAdmin) {
      query = 'DELETE FROM street_ratings WHERE id = $1';
      params = [id];
    } else {
      query = 'DELETE FROM street_ratings WHERE id = $1 AND user_id = $2';
      params = [id, userId];
    }

    const result = await pool.query(query, params);
    if (result.rowCount === 0) throw new Error('Rating not found or Unauthorized');
  }
}
