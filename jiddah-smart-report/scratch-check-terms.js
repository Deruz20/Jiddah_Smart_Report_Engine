const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('terms').select('*');
  console.log('terms:', data);
  console.log('error:', error);
}

check();
