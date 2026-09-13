import type { Knex } from "knex";

// The "Driver Safety" rating category was removed in
// 20260502175241_adjust_categories_and_severities, so submissions no longer
// carry a driver score. NULL means "not assessed" — the AVG() aggregates in
// route_safety/heatmap skip it, whereas the old DEFAULT 3 silently fabricated
// a mid-range score for every new rating.
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE street_ratings
      ALTER COLUMN driver_safety_score DROP NOT NULL,
      ALTER COLUMN driver_safety_score DROP DEFAULT
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE street_ratings SET driver_safety_score = 3 WHERE driver_safety_score IS NULL
  `);
  await knex.raw(`
    ALTER TABLE street_ratings
      ALTER COLUMN driver_safety_score SET DEFAULT 3,
      ALTER COLUMN driver_safety_score SET NOT NULL
  `);
}
