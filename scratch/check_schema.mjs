import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: schema, error: schemaErr } = await supabase.rpc('query_db', { query: `
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'theology_marks' OR table_name = 'circular_marks';
  ` });
  
  const { data: policies, error: polErr } = await supabase.rpc('query_db', { query: `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'theology_marks' OR tablename = 'circular_marks';
  ` });

  console.log('--- SCHEMA ---');
  console.log(JSON.stringify(schema, null, 2));
  console.log('--- POLICIES ---');
  console.log(JSON.stringify(policies, null, 2));
}

check();
