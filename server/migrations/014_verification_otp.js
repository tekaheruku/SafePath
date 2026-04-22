export async function up(knex) {
    await knex.raw(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS verification_otp varchar(6),
    ADD COLUMN IF NOT EXISTS verification_method varchar(10) DEFAULT 'link' NOT NULL
  `);
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('verification_otp');
        table.dropColumn('verification_method');
    });
}
