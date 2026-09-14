import type { Knex } from "knex";

/**
 * Route safety scoring measures every street_rating and report against a route
 * linestring with ST_DWithin. Without GIST indexes on the geography columns that
 * is a sequential scan per route, which is tolerable at demo scale and quadratic
 * afterwards. The original spatial-index migrations (002, 003, 007) were left as
 * empty stubs and are already recorded in knex_migrations, so they can never run
 * again — hence a fresh migration here.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_street_ratings_location_gist ON street_ratings USING GIST (location)'
  );
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_reports_location_gist ON reports USING GIST (location)'
  );
  // Routing only ever looks at confirmed reports, so a partial index keeps the
  // hot path small as the falsified/deleted backlog grows.
  await knex.raw(
    "CREATE INDEX IF NOT EXISTS idx_reports_location_confirmed_gist ON reports USING GIST (location) WHERE status = 'confirmed'"
  );
  // Supports the same-day recency predicate on the routing query.
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON reports (status, created_at DESC)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_reports_status_created_at');
  await knex.raw('DROP INDEX IF EXISTS idx_reports_location_confirmed_gist');
  await knex.raw('DROP INDEX IF EXISTS idx_reports_location_gist');
  await knex.raw('DROP INDEX IF EXISTS idx_street_ratings_location_gist');
}
