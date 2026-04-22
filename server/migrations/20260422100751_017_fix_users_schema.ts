import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasUsername = await knex.schema.hasColumn('users', 'username');
  if (hasUsername) {
    await knex.schema.alterTable('users', (table) => {
      table.renameColumn('username', 'name');
    });
  }

  const hasRole = await knex.schema.hasColumn('users', 'role');
  if (!hasRole) {
    await knex.schema.alterTable('users', (table) => {
      table.string('role').notNullable().defaultTo('user');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasRole = await knex.schema.hasColumn('users', 'role');
  if (hasRole) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('role');
    });
  }

  const hasName = await knex.schema.hasColumn('users', 'name');
  if (hasName) {
    await knex.schema.alterTable('users', (table) => {
      table.renameColumn('name', 'username');
    });
  }
}
