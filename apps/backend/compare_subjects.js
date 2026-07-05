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
  await supabase.auth.signInWithPassword({
    email: 'hassanhatima20@gmail.com',
    password: 'Jiddah'
  });

  const { data: subjectsTable } = await supabase.from('subjects').select('*');
  console.log('subjects table count:', subjectsTable.length);
  console.log('subjects table sample:', subjectsTable.slice(0, 3));

  const { data: circularSubjectsTable } = await supabase.from('circular_subjects').select('*');
  console.log('circular_subjects table count:', circularSubjectsTable.length);
  console.log('circular_subjects table sample:', circularSubjectsTable.slice(0, 3));
}

run();
