import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
  const randomId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('get_constraint', { constraint_name: 'teachers_role_check' });
  if (error) {
    // If we don't have an RPC, we can just use REST API or fetch from pg_catalog if we have access... wait, no SQL access.
    // I can just try inserting a few roles to see what works.
    const roles = ['DOS', 'Director of Studies', 'Dos', 'Head of Theology', 'Theology', 'Teacher'];
    const results = {};
    for (const r of roles) {
      const res = await supabase.from('teachers').insert([
        {
          id: crypto.randomUUID(),
          email: `test_role_${r.replace(/\s+/g, '_')}@example.com`,
          role: r,
          subject: 'Theology',
          name: 'Test DOS',
          classes: [],
          phone: null,
          status: 'active'
        }
      ]).select();
      if (res.error) {
        results[r] = "Failed";
      } else {
        results[r] = "Success";
        await supabase.from('teachers').delete().eq('id', res.data[0].id);
      }
    }
    fs.writeFileSync('test_insert_output2.json', JSON.stringify(results, null, 2));
  }
}
testInsert();
