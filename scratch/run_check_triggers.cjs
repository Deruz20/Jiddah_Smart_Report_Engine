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

async function run() {
  console.log('Logging in...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'hassanhatima20@gmail.com',
    password: 'Jiddah'
  });
  
  if (authErr) {
    console.error('Auth error:', authErr.message);
    return;
  }
  console.log('Auth successful.');

  const q = `
    SELECT tgname, tgrelid::regclass::text, tgenabled, proname
    FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid IN ('circular_marks'::regclass, 'theology_marks'::regclass);
  `;

  console.log('Trying rpc exec_sql...');
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { query: q });
  if (e1) {
    console.error('exec_sql failed:', e1.message);
    console.log('Trying rpc run_sql...');
    const { data: d2, error: e2 } = await supabase.rpc('run_sql', { sql_query: q });
    if (e2) {
      console.error('run_sql failed:', e2.message);
    } else {
      console.log('run_sql success:', d2);
    }
  } else {
    console.log('exec_sql success:', d1);
  }
}

run();
