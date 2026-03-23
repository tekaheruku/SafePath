import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('street_ratings', (table) => {
    table.text('comment');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('street_ratings', (table) => {
    table.dropColumn('comment');
  });
}
