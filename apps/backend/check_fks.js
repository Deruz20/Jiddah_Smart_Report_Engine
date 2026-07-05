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

  const query = `
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name IN ('circular_marks', 'theology_marks');
  `;

  // Since run_sql is not available, we can't run this query unless we use a supabase REST query if views are exposed.
  // Wait, let's see if we can just query the tables.
  console.log('Fetching one row from circular_marks and theology_marks to inspect structure...');
  const { data: cmark } = await supabase.from('circular_marks').select('*, enrollments(*), circular_subjects(*)').limit(1);
  console.log('Circular Mark:');
  console.log(JSON.stringify(cmark, null, 2));

  const { data: tmark } = await supabase.from('theology_marks').select('*, enrollments(*), theology_subjects(*)').limit(1);
  console.log('Theology Mark:');
  console.log(JSON.stringify(tmark, null, 2));
}

run();
