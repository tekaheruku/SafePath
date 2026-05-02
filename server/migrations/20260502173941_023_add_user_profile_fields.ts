import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add user profile fields
  await knex.schema.alterTable('users', (table) => {
    table.text('address').nullable();
    table.date('birthday').nullable();
    table.string('phone_number').nullable();
    table.string('id_verification_status').notNullable().defaultTo('not_verified'); // 'verified', 'not_verified', 'pending'
    table.string('account_status').notNullable().defaultTo('active'); // 'active', 'inactive', 'banned', 'suspended'
    table.string('id_front_url').nullable();
    table.string('id_back_url').nullable();
  });

  // Create rating_categories table
  await knex.schema.createTable('rating_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable(); // e.g., 'Pedestrian Safety', 'Lighting'
    table.string('slug').notNullable().unique();
    table.timestamps(true, true);
  });

  // Seed rating_categories
  await knex('rating_categories').insert([
    { name: 'Pedestrian Safety', slug: 'pedestrian-safety' },
    { name: 'Lighting', slug: 'lighting' },
    { name: 'Driver Safety', slug: 'driver-safety' },
    { name: 'Overall Safety', slug: 'overall-safety' }
  ]);

  // Rename "Rate Safety" to "Road Safety" in any existing config if needed
  // For now, we'll just ensure the frontend can fetch these labels.
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rating_categories');

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('address');
    table.dropColumn('birthday');
    table.dropColumn('phone_number');
    table.dropColumn('id_verification_status');
    table.dropColumn('account_status');
    table.dropColumn('id_front_url');
    table.dropColumn('id_back_url');
  });
}
