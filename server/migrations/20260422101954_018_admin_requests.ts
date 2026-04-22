import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('admin_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable();
    table.string('name').notNullable();
    table.string('requested_role').notNullable(); // 'lgu_admin' or 'superadmin'
    table.text('reason').nullable();
    table.string('status').notNullable().defaultTo('pending'); // 'pending', 'approved', 'rejected'
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admin_requests');
}
