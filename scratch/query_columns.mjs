import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

async function main() {
  console.log("--- QUERY 1 (RPC for information_schema) ---");
  // We can't query information_schema directly via JS client without RPC. 
  // Let's create an RPC if we have one or just fetch 1 row from both tables to see keys.
  
  // Since we can't do SELECT table_name... from information_schema easily, let's fetch 1 row and print Object.keys, or use an RPC if available.
  const { data: circularData, error: cErr } = await supabase.from('circular_marks').select('*').limit(1);
  console.log("circular_marks keys:", circularData ? Object.keys(circularData[0] || {}) : cErr);

  const { data: theologyData, error: tErr } = await supabase.from('theology_marks').select('*').limit(1);
  console.log("theology_marks keys:", theologyData ? Object.keys(theologyData[0] || {}) : tErr);

  console.log("\n--- QUERY 2 (Distinct sections) ---");
  // Supabase js doesn't support distinct well, but we can fetch all and distinct in JS
  const { data: subjectsData } = await supabase.from('subjects').select('section').eq('curriculum', 'theology');
  const sections = Array.from(new Set((subjectsData || []).map(s => s.section)));
  console.log(sections);

  console.log("\n--- QUERY 3 (Theology Classes) ---");
  const { data: classesData } = await supabase.from('theology_classes').select('*').limit(10);
  console.log(JSON.stringify(classesData, null, 2));
}

main();
