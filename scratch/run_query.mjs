import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

import fs from 'fs';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide a file path as the first argument.");
    process.exit(1);
  }
  
  const queryStr = fs.readFileSync(filePath, 'utf-8');
  const queries = queryStr.split(';').map(q => q.trim()).filter(q => q.length > 0);
  
  for (const q of queries) {
    try {
      console.log('Executing:', q.substring(0, 50) + '...');
      await pool.query(q);
    } catch (err) {
      console.error('Error executing query:', err);
      process.exit(1);
    }
  }
  console.log('All queries executed successfully.');
  await pool.end();
}

main().catch(console.error);
