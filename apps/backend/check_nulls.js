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
  console.log('--- Database Null Check ---');

  // Check circular_subjects with null section
  const { data: cs, error: cse } = await supabase.from('circular_subjects').select('id').is('section', null);
  console.log('circular_subjects with null section:', cse ? cse.message : cs.length);

  // Check theology_subjects with null level
  const { data: ts, error: tse } = await supabase.from('theology_subjects').select('id').is('level', null);
  console.log('theology_subjects with null level:', tse ? tse.message : ts.length);

  // Check circular_classes with null section
  const { data: cc, error: cce } = await supabase.from('circular_classes').select('id').is('section', null);
  console.log('circular_classes with null section:', cce ? cce.message : cc.length);

  // Check theology_classes with null level
  const { data: tc, error: tce } = await supabase.from('theology_classes').select('id').is('level', null);
  console.log('theology_classes with null level:', tce ? tce.message : tc.length);
}
run();
