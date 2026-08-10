import pg from 'pg';

const uri = "postgresql://postgres.vismrobdsdsaxmqegcay:sIUuJRxb7vc8hHnZ@aws-1-eu-west-2.pooler.supabase.com:5432/postgres";
const uriWithSSL = uri + "?sslmode=require";

console.log("Testing WITHOUT sslmode...");
const client1 = new pg.Client({ connectionString: uri });

async function run() {
  try {
    await client1.connect();
    console.log("SUCCESS! Connected to Supabase Pooler WITHOUT sslmode=require.");
    await client1.end();
  } catch (err) {
    console.error("FAILED WITHOUT sslmode:");
    console.error(err.message);
  }

  console.log("\nTesting WITH sslmode=require...");
  const client2 = new pg.Client({ connectionString: uriWithSSL });
  try {
    await client2.connect();
    console.log("SUCCESS! Connected to Supabase Pooler WITH sslmode=require.");
    await client2.end();
  } catch (err) {
    console.error("FAILED WITH sslmode:");
    console.error(err.message);
  }
}

run();
