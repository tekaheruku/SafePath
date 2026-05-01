export async function up(knex) {
    await knex.schema.alterTable('admin_requests', (table) => {
        table.string('document_url').nullable();
    });
}
export async function down(knex) {
    await knex.schema.alterTable('admin_requests', (table) => {
        table.dropColumn('document_url');
    });
}
