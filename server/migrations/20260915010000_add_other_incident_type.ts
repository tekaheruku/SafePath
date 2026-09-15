import type { Knex } from "knex";

/**
 * Adds an "Other" incident type so users can report something that doesn't
 * fit the fixed categories (Car Crash, Traffic Congestion, Road Hazard, Road
 * Blockage). Unlike those, an "Other" report needs a user-supplied title to
 * be identifiable — the reports.title column already exists (nullable, see
 * 20260501130000_022_make_reports_title_nullable.ts) but has never been
 * written to since the current submission flow only ever set incident type +
 * severity + description. The "Other" report flow is the first to use it.
 */
export async function up(knex: Knex): Promise<void> {
  const existing = await knex('incident_types').where({ slug: 'other' }).first();
  if (!existing) {
    await knex('incident_types').insert([
      { name: 'Other', slug: 'other', icon: '' },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('incident_types').where({ slug: 'other' }).delete();
}
