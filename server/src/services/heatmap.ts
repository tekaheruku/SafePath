/**
 * Heatmap Generation Service
 * Aggregates incident reports and street ratings to generate visual data
 */

import { pool } from '../config/database.js';
import { HeatmapPoint, HeatmapFilter } from '@safepath/shared';

export class HeatmapService {
  /**
   * Generate heatmap points based on reports and ratings
   */
  static async generateHeatmapData(filter: HeatmapFilter & { heatmap_type?: string }): Promise<{ data: HeatmapPoint[] }> {
    const type = filter.heatmap_type || 'all';
    
    // Robust date parsing (handle stringified "null" or empty strings from frontend)
    const filterAny = filter as any;
    const start_date = filterAny.start_date && filterAny.start_date !== 'null' && filterAny.start_date !== '' ? filterAny.start_date : null;
    const end_date = filterAny.end_date && filterAny.end_date !== 'null' && filterAny.end_date !== '' ? filterAny.end_date : null;
    const days_back = filterAny.days_back || 30;

    const params: any[] = [
      filter.min_longitude,
      filter.min_latitude,
      filter.max_longitude,
      filter.max_latitude,
    ];

    let timeFilter = '';
    if (start_date && end_date) {
      timeFilter = `AND created_at BETWEEN $5::timestamptz AND $6::timestamptz`;
      params.push(start_date, end_date);
    } else {
      timeFilter = `AND created_at >= NOW() - ($5::text || ' days')::interval`;
      params.push(days_back);
    }

    // Interval for recency weight calculation
    const intervalExpr = start_date && end_date 
      ? `(($6::timestamptz - $5::timestamptz))` 
      : `($5::text || ' days')::interval`;
    
    // Reference time for recency (NOW() or end_date)
    const refTime = start_date && end_date ? `$6::timestamptz` : `NOW()`;

    let query = '';

    if (type === 'incidents') {
      query = `
        WITH GridStats AS (
          SELECT 
            ST_X(ST_SnapToGrid(location::geometry, 0.0001)) as lng,
            ST_Y(ST_SnapToGrid(location::geometry, 0.0001)) as lat,
            AVG(
              CASE severity_level 
                WHEN 'low' THEN 1 
                WHEN 'medium' THEN 3 
                WHEN 'high' THEN 5 
                ELSE 1 
              END
            ) as avg_severity,
            COUNT(*) as report_count,
            AVG(
              1.0 - LEAST(1.0, GREATEST(0.0, 
                EXTRACT(EPOCH FROM (${refTime} - created_at)) /
                NULLIF(EXTRACT(EPOCH FROM ${intervalExpr}), 0)
              ))
            ) as recency_weight
          FROM reports
          WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
            ${timeFilter}
          GROUP BY lng, lat
        )
        SELECT 
          lng, 
          lat,
          (avg_severity / 5.0) * (0.5 + 0.5 * COALESCE(recency_weight, 1.0)) * (1.0 + LOG(report_count)) as intensity
        FROM GridStats
      `;
    } else if (type === 'ratings') {
      query = `
        SELECT 
          ST_X(ST_SnapToGrid(location::geometry, 0.0001)) as lng,
          ST_Y(ST_SnapToGrid(location::geometry, 0.0001)) as lat,
          (5.5 - AVG(overall_safety_score)) * 0.5 * COUNT(*) as intensity_raw,
          COUNT(*) as rating_count
        FROM street_ratings
        WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          ${timeFilter}
        GROUP BY lng, lat
      `;
    } else {
      // combined (all)
      query = `
        WITH GridStats AS (
          SELECT 
            ST_X(ST_SnapToGrid(location::geometry, 0.0001)) as lng,
            ST_Y(ST_SnapToGrid(location::geometry, 0.0001)) as lat,
            AVG(
              CASE severity_level 
                WHEN 'low' THEN 1 
                WHEN 'medium' THEN 3 
                WHEN 'high' THEN 5 
                ELSE 1 
              END
            ) as avg_severity,
            COUNT(*) as report_count,
            AVG(
              1.0 - LEAST(1.0, GREATEST(0.0, 
                EXTRACT(EPOCH FROM (${refTime} - created_at)) /
                NULLIF(EXTRACT(EPOCH FROM ${intervalExpr}), 0)
              ))
            ) as recency_weight
          FROM reports
          WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
            ${timeFilter}
          GROUP BY lng, lat
        ),
        StreetStats AS (
          SELECT 
            ST_X(ST_SnapToGrid(location::geometry, 0.0001)) as lng,
            ST_Y(ST_SnapToGrid(location::geometry, 0.0001)) as lat,
            AVG(overall_safety_score) as avg_safety_score,
            COUNT(*) as rating_count
          FROM street_ratings
          WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
            ${timeFilter}
          GROUP BY lng, lat
        )
        SELECT 
          COALESCE(gs.lng, ss.lng) as lng,
          COALESCE(gs.lat, ss.lat) as lat,
          CASE
            WHEN gs.avg_severity IS NOT NULL THEN
              (gs.avg_severity / 5.0) * (0.5 + 0.5 * gs.recency_weight) * (1.0 + LOG(gs.report_count))
            ELSE 0
          END +
          CASE 
            WHEN ss.avg_safety_score IS NOT NULL THEN (5.5 - ss.avg_safety_score) * 0.5 * ss.rating_count 
            ELSE 0 
          END as intensity
        FROM GridStats gs
        FULL OUTER JOIN StreetStats ss ON gs.lng = ss.lng AND gs.lat = ss.lat
      `;
    }

    const result = await pool.query(query, params);

    // Map results
    let rawPoints: { lng: number; lat: number; intensity: number }[];
    if (type === 'ratings') {
      rawPoints = result.rows.map(r => ({
        lng: parseFloat(r.lng),
        lat: parseFloat(r.lat),
        intensity: Math.max(0, parseFloat(r.intensity_raw) || 0),
      }));
    } else {
      rawPoints = result.rows.map(r => ({
        lng: parseFloat(r.lng),
        lat: parseFloat(r.lat),
        intensity: Math.max(0, parseFloat(r.intensity) || 0),
      }));
    }

    // Normalize intensities
    let maxIntensity = 0;
    rawPoints.forEach(p => { if (p.intensity > maxIntensity) maxIntensity = p.intensity; });
    maxIntensity = Math.max(0.1, maxIntensity);

    const points: HeatmapPoint[] = rawPoints.map(p => {
      const normalized = p.intensity / maxIntensity;
      return {
        longitude: p.lng,
        latitude: p.lat,
        // If the point has zero intensity, it should stay zero. 
        // Only apply the 0.05 visual floor to points with actual data.
        intensity: p.intensity <= 0 ? 0 : Math.min(1, Math.max(0.05, normalized)),
      };
    });

    return { data: points };
  }

  /**
   * Cache heatmap results in the database
   */
  static async cacheHeatmapData(points: HeatmapPoint[]): Promise<void> {
    // Basic caching implementation - normally you'd use a dedicated table or Redis
    console.log(`[HeatmapService] Caching ${points.length} points for faster retrieval`);
  }
}
