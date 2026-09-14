import type { Knex } from "knex";

// Removes the ID-document verification feature entirely: storing user-submitted
// ID photos and a verification status was judged an unnecessary privacy/security
// liability now that reports are cross-checked by AI plausibility scoring and
// community voting instead.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('id_verification_status');
    table.dropColumn('id_front_url');
    table.dropColumn('id_back_url');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('id_verification_status').notNullable().defaultTo('not_verified');
    table.string('id_front_url').nullable();
    table.string('id_back_url').nullable();
  });
}
