import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
  await knex('users').where({ role: 'lgu_admin' }).update({ role: 'pnp_admin' });
  await knex('admin_requests').where({ requested_role: 'lgu_admin' }).update({ requested_role: 'pnp_admin' });
  await knex.raw(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role = ANY (ARRAY['user'::text, 'pnp_admin'::text, 'superadmin'::text]));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
  await knex('users').where({ role: 'pnp_admin' }).update({ role: 'lgu_admin' });
  await knex('admin_requests').where({ requested_role: 'pnp_admin' }).update({ requested_role: 'lgu_admin' });
  await knex.raw(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role = ANY (ARRAY['user'::text, 'lgu_admin'::text, 'superadmin'::text]));
  `);
}
