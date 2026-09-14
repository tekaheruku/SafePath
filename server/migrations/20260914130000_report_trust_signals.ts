import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reports', (table) => {
    table.float('ai_plausibility_score').nullable();
    table.text('ai_flag_reason').nullable();
  });

  await knex.schema.alterTable('users', (table) => {
    table.float('trust_score').notNullable().defaultTo(0.5);
    table.integer('confirmed_reports_count').notNullable().defaultTo(0);
    table.integer('falsified_reports_count').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('trust_score');
    table.dropColumn('confirmed_reports_count');
    table.dropColumn('falsified_reports_count');
  });

  await knex.schema.alterTable('reports', (table) => {
    table.dropColumn('ai_plausibility_score');
    table.dropColumn('ai_flag_reason');
  });
}
