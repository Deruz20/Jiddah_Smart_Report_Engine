import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Please provide a query as the first argument.");
    process.exit(1);
  }
  
  const res = await pool.query(query);
  console.table(res.rows);
  await pool.end();
}

main().catch(console.error);
