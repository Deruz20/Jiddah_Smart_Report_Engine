const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: existingMark } = await sb.from('theology_marks')
    .select('*')
    .eq('enrollment_id', '29e48ff5-8a32-4ab8-8c46-1be19d4aff92')
    .eq('subject_id', '657a93d9-c473-4054-9d65-bd9b9593836d')
    .single();

  console.log('Existing Mark ID:', existingMark.id);

  // PowerSync upsert without term_id
  const opData = {
    enrollment_id: '29e48ff5-8a32-4ab8-8c46-1be19d4aff92',
    subject_id: '657a93d9-c473-4054-9d65-bd9b9593836d',
    mot_score: 90,
    eot_score: 85
  };

  const { data, error } = await sb.from('theology_marks').upsert({ id: existingMark.id, ...opData }).select();
  console.log('Upsert Error:', error);
}
run();
