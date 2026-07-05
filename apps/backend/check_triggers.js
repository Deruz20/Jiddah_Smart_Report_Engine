const fs = require('fs');
const env = fs.readFileSync('c:\\Users\\JIDDAH\\Desktop\\jiddah-smart-report-engine\\apps\\backend\\.env.production', 'utf-8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runSQL() {
  const q1 = `SELECT tgname, tgrelid::regclass, tgenabled, proname
    FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid IN ('circular_marks'::regclass, 'theology_marks'::regclass);`;
  const { data: d1, error: e1 } = await supabase.rpc('run_sql', { sql_query: q1 });
  console.log('Error:', e1 ? e1.message : 'Success');
  console.log(JSON.stringify(d1, null, 2));
}
runSQL();
