import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // The `title` column was originally NOT NULL but the current report submission
  // flow (incident_type_id + severity_level_id based) never supplies a title.
  // PostgreSQL rejects every INSERT with a NOT NULL violation, causing all
  // report submissions to silently fail with a 400 "VALIDATION_ERROR".
  // Making the column nullable unblocks submissions while preserving any
  // existing data in the column.
  await knex.schema.alterTable('reports', (table) => {
    table.string('title', 200).nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Restore NOT NULL — only safe if all rows have a non-null title.
  await knex.schema.alterTable('reports', (table) => {
    table.string('title', 200).notNullable().alter();
  });
}
