export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.boolean('is_verified').notNullable().defaultTo(false);
        table.string('verification_token').nullable();
        table.timestamp('verification_token_expires').nullable();
        table.string('reset_token').nullable();
        table.timestamp('reset_token_expires').nullable();
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('is_verified');
        table.dropColumn('verification_token');
        table.dropColumn('verification_token_expires');
        table.dropColumn('reset_token');
        table.dropColumn('reset_token_expires');
    });
}
