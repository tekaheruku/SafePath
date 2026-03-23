import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('street_ratings', (table) => {
    table.float('lighting_score');
    table.float('pedestrian_safety_score');
    table.float('driver_safety_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('street_ratings', (table) => {
    table.dropColumns('lighting_score', 'pedestrian_safety_score', 'driver_safety_score');
  });
}
