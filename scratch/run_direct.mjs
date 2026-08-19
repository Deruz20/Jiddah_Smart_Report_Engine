
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });
async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, statement_timeout: 5000 });
  await client.connect();
  console.log('Connected');
  try {
    await client.query('SET lock_timeout = 5000;');
    console.log('Running Q1');
    await client.query('ALTER TABLE teacher_initials ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES circular_classes(id) ON DELETE CASCADE;');
    console.log('Running Q2');
    await client.query('ALTER TABLE teacher_initials DROP CONSTRAINT IF EXISTS teacher_initials_level_subject_id_key;');
    console.log('Running Q3');
    await client.query('ALTER TABLE teacher_initials ADD CONSTRAINT teacher_initials_level_subject_class_unique UNIQUE NULLS NOT DISTINCT (level, subject_id, class_id);');
    console.log('Success');
  } catch(e) {
    console.error(e.message);
  } finally {
    await client.end();
  }
}
main();

