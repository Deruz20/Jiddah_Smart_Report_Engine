const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://vismrobdsdsaxmqegcay.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: students, error } = await supabase.from('students').select('id, name').is('arabic_name', null);
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }
  
  if (!students || students.length === 0) {
    console.log('No students missing Arabic names.');
    return;
  }

  console.log(`Found ${students.length} students missing Arabic names. Transliterating via API...`);
  
  const names = students.map(s => s.name);
  
  const res = await fetch('http://localhost:3000/api/transliterate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names })
  });

  if (!res.ok) {
    console.error('Failed to fetch from transliterate API');
    return;
  }
  
  const { transliterated } = await res.json();
  
  let count = 0;
  for (let i = 0; i < students.length; i++) {
    if (transliterated[i]) {
      console.log(`Setting ${students[i].name} to ${transliterated[i]}`);
      await supabase.from('students').update({ arabic_name: transliterated[i] }).eq('id', students[i].id);
      count++;
    }
  }
  
  console.log(`Successfully updated ${count} students!`);
}

run();
