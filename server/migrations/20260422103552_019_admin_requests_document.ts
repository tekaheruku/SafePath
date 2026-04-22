import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('admin_requests', (table) => {
    table.string('document_url').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('admin_requests', (table) => {
    table.dropColumn('document_url');
  });
}
