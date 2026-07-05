const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const query = `
    SELECT tgname, tgrelid::regclass, tgenabled, proname
    FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid IN ('circular_marks'::regclass, 'theology_marks'::regclass);
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    console.error("RPC exec_sql error:", error);
    // Alternatively fallback to standard postgres client if RPC isn't available
  } else {
    console.log("TRIGGER DATA:");
    console.table(data);
  }
}

run();
