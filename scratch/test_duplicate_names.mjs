import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabaseAdmin.rpc('get_schema');
  // Just query the information schema or use raw postgres connection if possible, but RPC may not be available.
  // Instead, let's just insert a dummy student and then another with the SAME NAME but different admission number to see if it fails.
  const { data: d1, error: e1 } = await supabaseAdmin.from('students').insert({ name: 'TEST_STUDENT_SAME_NAME', admission_number: 'ADM_001_TEST', is_muslim: false }).select();
  if (e1) console.error('E1:', e1);
  const { data: d2, error: e2 } = await supabaseAdmin.from('students').insert({ name: 'TEST_STUDENT_SAME_NAME', admission_number: 'ADM_002_TEST', is_muslim: false }).select();
  if (e2) console.error('E2:', e2);
  
  // Cleanup
  await supabaseAdmin.from('students').delete().eq('name', 'TEST_STUDENT_SAME_NAME');
  console.log('Done testing duplicate names');
}
checkSchema();
