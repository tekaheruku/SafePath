export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.timestamp('banned_until').nullable();
        table.text('ban_reason').nullable();
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('banned_until');
        table.dropColumn('ban_reason');
    });
}
