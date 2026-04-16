import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reports', (table) => {
    table.text('photo_url').nullable();
  });

  await knex.schema.alterTable('street_ratings', (table) => {
    table.text('photo_url').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('street_ratings', (table) => {
    table.dropColumn('photo_url');
  });

  await knex.schema.alterTable('reports', (table) => {
    table.dropColumn('photo_url');
  });
}
