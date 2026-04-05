export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.integer('failed_login_attempts').notNullable().defaultTo(0);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('failed_login_attempts');
    });
}
