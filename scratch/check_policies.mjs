import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.vismrobdsdsaxmqegcay:sIUuJRxb7vc8hHnZ@aws-1-eu-west-2.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000 // 5 second timeout
  });
  
  try {
    await client.connect();
    console.log('Connected to DB');

    const res = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('enrollments', 'students', 'circular_classes', 'theology_classes')
      ORDER BY tablename, policyname;
    `);

    if (res.rows.length === 0) {
      console.log('No RLS policies found for these tables.');
    } else {
      console.table(res.rows);
    }
  } catch (err) {
    console.error('Error querying policies:', err);
  } finally {
    await client.end();
  }
}

run();
