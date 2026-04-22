export async function up(knex) {
    await knex.raw(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false NOT NULL 
  `);
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('two_factor_enabled');
    });
}
