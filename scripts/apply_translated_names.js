const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    // Read the translated JSON file
    const translatedData = JSON.parse(fs.readFileSync('translated_names.json', 'utf-8'));
    
    console.log(`Found ${translatedData.length} translated names. Updating database...`);

    let successCount = 0;
    let errorCount = 0;

    for (const student of translatedData) {
      if (!student.arabic_name || (!student.id && !student.name)) {
        console.warn(`Skipping invalid entry: ${JSON.stringify(student)}`);
        continue;
      }

      let query = supabase.from('students').update({ arabic_name: student.arabic_name });
      
      if (student.id) {
        query = query.eq('id', student.id);
      } else {
        query = query.eq('name', student.name);
      }

      const { error } = await query;

      if (error) {
        console.error(`Error updating student ${student.name} (${student.id}):`, error.message);
        errorCount++;
      } else {
        successCount++;
        console.log(`Updated: ${student.name} -> ${student.arabic_name}`);
      }
    }

    console.log(`\nMigration complete! Successfully updated: ${successCount}. Errors: ${errorCount}.`);
  } catch (err) {
    console.error("Failed to run migration:", err.message);
  }
}

run();
