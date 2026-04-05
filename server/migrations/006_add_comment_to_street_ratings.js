export async function up(knex) {
    await knex.schema.table('street_ratings', (table) => {
        table.text('comment');
    });
}
export async function down(knex) {
    await knex.schema.table('street_ratings', (table) => {
        table.dropColumn('comment');
    });
}
