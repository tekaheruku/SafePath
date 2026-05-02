import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Update severity levels to: Minor, Moderate, Serious, Critical
  await knex('severity_levels').del();
  await knex('severity_levels').insert([
    { level: 1, name: 'Minor', color_code: '#22c55e', description: 'Little to no impact on road users' },
    { level: 2, name: 'Moderate', color_code: '#eab308', description: 'Causes inconvenience or slowdowns' },
    { level: 3, name: 'Serious', color_code: '#f97316', description: 'Poses a risk of injury or significant disruption' },
    { level: 4, name: 'Critical', color_code: '#ef4444', description: 'Immediate danger, road may be impassable' }
  ]);

  // Update rating_categories to only: Pedestrian Safety, Lighting
  await knex('rating_categories').del();
  await knex('rating_categories').insert([
    { name: 'Pedestrian Safety', slug: 'pedestrian-safety' },
    { name: 'Lighting', slug: 'lighting' }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Restore previous state if needed
}
