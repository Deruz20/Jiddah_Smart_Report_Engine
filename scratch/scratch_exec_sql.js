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
// using service role if possible? wait, I don't have it.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runSQL() {
  const q1 = "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('circular_subjects','circular_classes','enrollments');";
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { query: q1 });
  console.log('Q1 Error (exec_sql):', e1 ? e1.message : 'Success');
  console.log(JSON.stringify(d1, null, 2));

  // try with run_sql if exec_sql doesn't work
  if (e1) {
    const { data: d2, error: e2 } = await supabase.rpc('run_sql', { sql_query: q1 });
    console.log('Q2 Error (run_sql):', e2 ? e2.message : 'Success');
    console.log(JSON.stringify(d2, null, 2));
  }
}
runSQL();
