export async function up(knex) {
    await knex.schema.alterTable('reports', (table) => {
        table.string('title', 200).nullable().alter();
    });
}

export async function down(knex) {
    await knex.schema.alterTable('reports', (table) => {
        table.string('title', 200).notNullable().alter();
    });
}
