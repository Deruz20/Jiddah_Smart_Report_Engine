import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('No DATABASE_URL in .env.local');
    return;
  }
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- RLS ENABLED ---');
  const res1 = await client.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname IN ('theology_marks', 'circular_marks');
  `);
  console.log(res1.rows);

  console.log('\n--- POLICIES ---');
  const res2 = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename IN ('theology_marks', 'circular_marks');
  `);
  console.log(res2.rows);

  console.log('\n--- GRANTS ---');
  const res3 = await client.query(`
    SELECT grantee, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_name IN ('theology_marks', 'circular_marks') AND grantee IN ('authenticated', 'anon');
  `);
  console.log(res3.rows);

  console.log('\n--- CONSTRAINTS ---');
  const res4 = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname IN ('theology_marks', 'circular_marks');
  `);
  console.log(res4.rows);

  console.log('\n--- TRIGGERS ---');
  const res5 = await client.query(`
    SELECT tgname
    FROM pg_trigger
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname IN ('theology_marks', 'circular_marks');
  `);
  console.log(res5.rows);

  await client.end();
}

check();
