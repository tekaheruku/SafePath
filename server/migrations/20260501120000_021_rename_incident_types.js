export async function up(knex) {
    // 1. Rename 'Road Crash' → 'Car Crash', slug: 'car-crash', clear emoji
    await knex('incident_types')
        .where({ slug: 'road-crash' })
        .update({ name: 'Car Crash', slug: 'car-crash', icon: '' });

    // 2. Rename 'Road Traffic' → 'Traffic Congestion', slug: 'traffic-congestion', clear emoji
    await knex('incident_types')
        .where({ slug: 'road-traffic' })
        .update({ name: 'Traffic Congestion', slug: 'traffic-congestion', icon: '' });

    // 3. Rename 'Pothole' → 'Road Hazard', slug: 'road-hazard', clear emoji
    await knex('incident_types')
        .where({ slug: 'pothole' })
        .update({ name: 'Road Hazard', slug: 'road-hazard', icon: '' });

    // 4. Migrate any reports pointing to 'slippery-wet-road' → 'road-hazard'
    const roadHazard = await knex('incident_types')
        .where({ slug: 'road-hazard' })
        .select('id')
        .first();

    const slippery = await knex('incident_types')
        .where({ slug: 'slippery-wet-road' })
        .select('id')
        .first();

    if (slippery && roadHazard) {
        await knex('reports')
            .where({ incident_type_id: slippery.id })
            .update({ incident_type_id: roadHazard.id });

        // 5. Delete the now-redundant 'slippery-wet-road' row
        await knex('incident_types').where({ id: slippery.id }).delete();
    }

    // 6. Clear emoji from 'Road Blockage' as well
    await knex('incident_types')
        .where({ slug: 'road-blockage' })
        .update({ icon: '' });
}

export async function down(knex) {
    // Restore original names/slugs/icons (best-effort — merged row cannot be fully un-merged)
    await knex('incident_types')
        .where({ slug: 'car-crash' })
        .update({ name: 'Road Crash', slug: 'road-crash', icon: '💥' });

    await knex('incident_types')
        .where({ slug: 'traffic-congestion' })
        .update({ name: 'Road Traffic', slug: 'road-traffic', icon: '🚗' });

    await knex('incident_types')
        .where({ slug: 'road-hazard' })
        .update({ name: 'Pothole', slug: 'pothole', icon: '🕳️' });

    // Re-insert the removed 'Slippery / Wet Road' row
    await knex('incident_types').insert([
        { name: 'Slippery / Wet Road', slug: 'slippery-wet-road', icon: '💧' },
    ]);

    // Restore 'Road Blockage' emoji
    await knex('incident_types')
        .where({ slug: 'road-blockage' })
        .update({ icon: '🚧' });
}
