import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Kill all connections to this database (other than our own)
  const killRes = await pool.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = current_database() 
    AND pid <> pg_backend_pid();
  `);
  console.log(`Killed ${killRes.rowCount} connections.`);
  
  // Now run the migration
  const q1 = `ALTER TABLE teacher_initials ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES circular_classes(id) ON DELETE CASCADE;`;
  const q2 = `ALTER TABLE teacher_initials DROP CONSTRAINT IF EXISTS teacher_initials_level_subject_id_key;`;
  const q3 = `ALTER TABLE teacher_initials ADD CONSTRAINT teacher_initials_level_subject_class_unique UNIQUE NULLS NOT DISTINCT (level, subject_id, class_id);`;
  
  console.log("Running Q1");
  await pool.query(q1);
  console.log("Running Q2");
  await pool.query(q2);
  console.log("Running Q3");
  await pool.query(q3);
  
  console.log("Done");
  await pool.end();
}
main().catch(console.error);
