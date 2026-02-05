// One-time script to migrate station.json data to Supabase
// Run: node migrate-data.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrate() {
  try {
    // Read old station data
    const dataPath = path.join(__dirname, 'src', 'station.json');
    if (!fs.existsSync(dataPath)) {
      console.log('No src/station.json found - skipping migration');
      return;
    }

    const oldData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Found ${oldData.length} stations to migrate`);

    for (const oldStation of oldData) {
      // Insert station
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .insert([{
          name: oldStation.name,
          lat: oldStation.lat,
          lng: oldStation.lng
        }])
        .select()
        .single();

      if (stationError) {
        console.error(`Failed to insert station ${oldStation.name}:`, stationError);
        continue;
      }

      console.log(`✓ Migrated station: ${station.name}`);

      // Create placeholder chargers if totalChargers exists
      if (oldStation.totalChargers) {
        for (let i = 1; i <= oldStation.totalChargers; i++) {
          const { error: chargerError } = await supabase
            .from('chargers')
            .insert([{
              station_id: station.id,
              charger_index: i,
              vendor: null,
              serial_number: null,
              model_number: null,
              mac_address: null,
              images: []
            }]);

          if (chargerError) {
            console.error(`  Failed to create charger ${i}:`, chargerError);
          } else {
            console.log(`  ✓ Created placeholder for Charger ${i}`);
          }
        }
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('You can now add details and photos for each charger through the admin panel.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
