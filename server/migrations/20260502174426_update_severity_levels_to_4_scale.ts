import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Clear existing severity levels
  await knex('severity_levels').del();

  // Insert new 4-level scale
  await knex('severity_levels').insert([
    { level: 1, name: 'Low Risk', color_code: '#22c55e', description: 'Safe for all road users.' },
    { level: 2, name: 'Moderate Risk', color_code: '#f59e0b', description: 'Requires caution.' },
    { level: 3, name: 'High Risk', color_code: '#f97316', description: 'Potentially dangerous conditions.' },
    { level: 4, name: 'Extreme Risk', color_code: '#ef4444', description: 'Immediate hazard to safety.' }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex('severity_levels').del();
  await knex('severity_levels').insert([
    { level: 1, name: 'Low', color: '#22c55e' },
    { level: 2, name: 'Medium', color: '#f59e0b' },
    { level: 3, name: 'High', color: '#ef4444' }
  ]);
}
