import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // A `report_comments` table already exists in some environments, created outside
  // migration tracking during earlier (dead) comment scaffolding — it only has an
  // `id`/`report_id`/`user_id`/`comment` shape, is empty, and no application code
  // references it. Replace it cleanly with the real schema below.
  await knex.schema.dropTableIfExists('report_comments');

  await knex.schema.createTable('report_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('report_id').references('id').inTable('reports').onDelete('CASCADE').notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('content').nullable();
    table.string('photo_url').nullable();
    table.integer('upvotes_count').notNullable().defaultTo(0);
    table.integer('downvotes_count').notNullable().defaultTo(0);
    table.boolean('ai_flagged').notNullable().defaultTo(false);
    table.text('ai_flag_reason').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('report_comment_votes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('comment_id').references('id').inTable('report_comments').onDelete('CASCADE').notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('vote_type').notNullable();
    table.timestamps(true, true);
    table.unique(['comment_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('report_comment_votes');
  await knex.schema.dropTableIfExists('report_comments');
}
