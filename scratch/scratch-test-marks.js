const { createClient } = require('@supabase/supabase-js');
const url = "https://vismrobdsdsaxmqegcay.supabase.co"
const key = "sb_publishable_-mO-WgFALSPND0zqqcoC8g_aSS0gfkA"

const supabase = createClient(url, key);

async function run() {
  const { data } = await supabase.from('circular_marks').select('enrollment_id, term_id').limit(1);
  if (data && data.length > 0) {
    console.log('HAS_MARKS_ENROLLMENT_ID:', data[0].enrollment_id);
    console.log('HAS_MARKS_TERM_ID:', data[0].term_id);
  } else {
    console.log('No marks found in circular_marks table.');
  }
}

run();
