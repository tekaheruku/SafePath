import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('chat_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('chat_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').references('id').inTable('chat_sessions').onDelete('CASCADE').notNullable();
    table.string('role').notNullable(); // 'user' | 'assistant' | 'system'
    table.text('content').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chat_messages');
  await knex.schema.dropTableIfExists('chat_sessions');
}
