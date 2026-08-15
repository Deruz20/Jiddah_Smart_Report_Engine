import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

async function run() {
  const res = await fetch(url);
  const data = await res.json();
  const teachersSchema = data.definitions.teachers.properties;
  console.log("Teachers Table Columns:");
  for (const [col, details] of Object.entries(teachersSchema)) {
    console.log(`- ${col}: ${details.type} (${details.format})`);
  }
}

run();
