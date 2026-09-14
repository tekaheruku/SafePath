import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check');
  await knex.raw("ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'confirmed', 'falsified', 'deleted'))");
}

export async function down(knex: Knex): Promise<void> {
  await knex('reports').where('status', 'deleted').update({ status: 'falsified' });
  await knex.raw('ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check');
  await knex.raw("ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'confirmed', 'falsified'))");
}
