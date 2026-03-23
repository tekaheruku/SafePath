import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // First, drop the column
  await knex.schema.table('street_ratings', (table) => {
    table.dropColumn('geom');
  });

  // Then add it back as a Point
  await knex.schema.table('street_ratings', (table) => {
    table.specificType('geom', 'geography(Point, 4326)').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('street_ratings', (table) => {
    table.dropColumn('geom');
  });

  await knex.schema.table('street_ratings', (table) => {
    table.specificType('geom', 'geography(MultiLineString, 4326)').notNullable();
  });
}
