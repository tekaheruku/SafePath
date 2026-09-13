import { Knex } from "knex";

// Migration 011 added `is_verified` defaulting to false for every existing
// row, but never backfilled accounts that were created before email
// verification existed. Those accounts have no verification_token and no
// verification_otp (registration always issues one or the other), so they
// can be distinguished from accounts that legitimately still need to verify.
export async function up(knex: Knex): Promise<void> {
  await knex('users')
    .where('is_verified', false)
    .whereNull('verification_token')
    .whereNull('verification_otp')
    .update({ is_verified: true });
}

export async function down(knex: Knex): Promise<void> {
  // Not reversible: we can no longer tell which rows were backfilled here
  // versus verified normally.
}
