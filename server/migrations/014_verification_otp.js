/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    // Stores the 6-digit OTP when the user picks OTP verification.
    // NULL when using magic-link mode.
    table.string('verification_otp', 6).nullable();
    // 'link' (default/existing) or 'otp'
    table.string('verification_method', 10).notNullable().defaultTo('link');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('verification_otp');
    table.dropColumn('verification_method');
  });
}
