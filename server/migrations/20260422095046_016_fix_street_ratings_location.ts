import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasGeom = await knex.schema.hasColumn('street_ratings', 'geom');
  if (hasGeom) {
    await knex.schema.alterTable('street_ratings', (table) => {
      table.dropColumn('geom');
      table.specificType('location', 'geography(Point, 4326)');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasLocation = await knex.schema.hasColumn('street_ratings', 'location');
  if (hasLocation) {
    await knex.schema.alterTable('street_ratings', (table) => {
      table.dropColumn('location');
      table.specificType('geom', 'geography(MultiLineString, 4326)');
    });
  }
}
