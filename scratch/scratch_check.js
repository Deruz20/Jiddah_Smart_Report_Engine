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

async function checkRow() {
  const { data, error } = await supabase.from('circular_classes').select('*').eq('class_name', 'test_rls');
  if (error) {
    console.error('Error querying:', error.message);
  } else {
    console.log('Test rows remaining:', data.length);
  }
  
  if (data && data.length > 0) {
    console.log('Row was NOT cleaned up! Deleting it now...');
    const { data: dData, error: dErr } = await supabase.from('circular_classes').delete().eq('class_name', 'test_rls').select();
    if (dErr) console.error('Error deleting:', dErr.message);
    else console.log('Deleted rows:', dData ? dData.length : 0);
  }
}
checkRow();
