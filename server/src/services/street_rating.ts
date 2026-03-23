import { pool } from '../config/database.js';

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
}
