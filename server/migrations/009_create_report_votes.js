export async function up(knex) {
    await knex.schema.createTable('report_votes', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('report_id').references('id').inTable('reports').onDelete('CASCADE').notNullable();
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
        table.string('vote_type').notNullable(); // 'up' or 'down'
        table.timestamps(true, true);
        // One vote per user per report
        table.unique(['report_id', 'user_id']);
    });
    // Adding columns to reports table for faster querying
    await knex.schema.table('reports', (table) => {
        table.integer('upvotes_count').defaultTo(0);
        table.integer('downvotes_count').defaultTo(0);
    });
}
export async function down(knex) {
    await knex.schema.table('reports', (table) => {
        table.dropColumns('upvotes_count', 'downvotes_count');
    });
    await knex.schema.dropTableIfExists('report_votes');
}
