import type { Knex } from "knex";

// Stores the individual text/photo AI component scores behind the combined
// ai_plausibility_score, so admins can see exactly what drove a report's rating
// instead of just the final blended number.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reports', (table) => {
    table.jsonb('ai_score_breakdown').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reports', (table) => {
    table.dropColumn('ai_score_breakdown');
  });
}
