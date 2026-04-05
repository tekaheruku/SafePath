export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.boolean('two_factor_enabled').notNullable().defaultTo(false);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('two_factor_enabled');
    });
}
