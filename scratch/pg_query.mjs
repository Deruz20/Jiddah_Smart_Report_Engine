import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("--- QUERY 1 ---");
  const res1 = await pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('circular_marks','theology_marks') ORDER BY table_name, ordinal_position;`);
  console.table(res1.rows);

  console.log("\n--- QUERY 2 ---");
  const res2 = await pool.query(`SELECT DISTINCT section FROM subjects WHERE curriculum = 'theology';`);
  console.table(res2.rows);

  console.log("\n--- QUERY 3 ---");
  const res3 = await pool.query(`SELECT * FROM theology_classes LIMIT 10;`);
  console.table(res3.rows);

  await pool.end();
}
main().catch(console.error);
