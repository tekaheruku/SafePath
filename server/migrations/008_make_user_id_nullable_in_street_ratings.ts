import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('street_ratings', (table) => {
    table.uuid('user_id').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('street_ratings', (table) => {
    table.uuid('user_id').notNullable().alter();
  });
}
