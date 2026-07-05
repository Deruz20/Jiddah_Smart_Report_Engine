import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const query = `
    SELECT tgname, tgrelid::regclass, tgenabled, proname
    FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid IN ('circular_marks'::regclass, 'theology_marks'::regclass);
  `;
  const { data, error } = await supabase.rpc('run_sql', { sql_query: query });
  if (error) {
    console.error("run_sql failed:", error);
    const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { query });
    if (e2) console.error("exec_sql failed:", e2);
    else console.table(d2);
  } else {
    console.table(data);
  }
}
run();
