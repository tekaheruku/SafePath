export async function up(knex) {
    // Create incident_types table
    await knex.schema.createTable('incident_types', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable();
        table.string('slug').notNullable().unique();
        table.string('icon').notNullable();
        table.timestamps(true, true);
    });
    // Create severity_levels table
    await knex.schema.createTable('severity_levels', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable();
        table.string('description').notNullable();
        table.string('color_code').notNullable();
        table.integer('level').notNullable().unique(); // 1 = Minor, 2 = Moderate, 3 = Serious, 4 = Critical
        table.timestamps(true, true);
    });
    // Insert seed data
    await knex('incident_types').insert([
        { name: 'Road Crash', slug: 'road-crash', icon: '💥' },
        { name: 'Road Traffic', slug: 'road-traffic', icon: '🚗' },
        { name: 'Pothole', slug: 'pothole', icon: '🕳️' },
        { name: 'Slippery / Wet Road', slug: 'slippery-wet-road', icon: '💧' },
        { name: 'Road Blockage', slug: 'road-blockage', icon: '🚧' }
    ]);
    await knex('severity_levels').insert([
        { name: 'Minor', description: 'Little to no impact on road users', color_code: '#22c55e', level: 1 }, // green
        { name: 'Moderate', description: 'Causes inconvenience or slowdowns', color_code: '#eab308', level: 2 }, // yellow
        { name: 'Serious', description: 'Poses a risk of injury or significant disruption', color_code: '#f97316', level: 3 }, // orange
        { name: 'Critical', description: 'Immediate danger, road may be impassable', color_code: '#ef4444', level: 4 } // red
    ]);
    // Alter reports table
    await knex.schema.alterTable('reports', (table) => {
        table.uuid('incident_type_id').references('id').inTable('incident_types').onDelete('SET NULL');
        table.uuid('severity_level_id').references('id').inTable('severity_levels').onDelete('SET NULL');
    });
    // Try to map existing data (optional but good for consistency)
    // We can do this with raw SQL or knex updates.
    // We'll skip for now and just allow them to be nullable, 
    // or we can drop old columns if instructed. The user just says:
    // "updated /api/reports POST handler that accepts the new fields."
    // We will keep old columns for backward compatibility for a moment, or drop them. Let's make the new columns nullable for now, or just leave old ones alone.
}
export async function down(knex) {
    await knex.schema.alterTable('reports', (table) => {
        table.dropColumn('incident_type_id');
        table.dropColumn('severity_level_id');
    });
    await knex.schema.dropTableIfExists('severity_levels');
    await knex.schema.dropTableIfExists('incident_types');
}
