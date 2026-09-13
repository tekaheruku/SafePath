import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Drop old check constraint first so 'confirmed' is valid
  await knex.raw('ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check');

  // Update existing records to 'confirmed' so that current live reports remain visible
  await knex('reports').update({ status: 'confirmed' });

  // Add new check constraint for pending, confirmed, falsified
  await knex.raw("ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'confirmed', 'falsified'))");

  // Set default to 'pending' for all new report submissions
  await knex.raw("ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'pending'");
}

export async function down(knex: Knex): Promise<void> {
  // Revert column default
  await knex.raw("ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'open'");

  // Drop current check constraint
  await knex.raw('ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check');

  // Revert any statuses not compatible with old constraint
  await knex('reports').whereNotIn('status', ['open', 'resolved']).update({ status: 'open' });

  // Restore previous check constraint
  await knex.raw("ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('open', 'resolved'))");
}
