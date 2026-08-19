import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const res = await pool.query(`SELECT blocking_locks.pid::integer AS blocking_pid, blocking_activity.usename AS blocking_user, blocked_locks.pid::integer AS blocked_pid, blocked_activity.usename AS blocked_user, blocked_activity.query AS blocked_statement, blocking_activity.query AS current_statement_in_blocking_process FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid AND blocking_locks.pid != blocked_locks.pid JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;`);
  console.table(res.rows);
  const act = await pool.query(`SELECT pid, state, query FROM pg_stat_activity WHERE query ILIKE '%teacher_initials%' AND pid != pg_backend_pid();`);
  console.table(act.rows);
  
  // terminate all idle connections
  const idle = await pool.query(`SELECT pid FROM pg_stat_activity WHERE state = 'idle in transaction';`);
  for (const row of idle.rows) {
      await pool.query(`SELECT pg_terminate_backend(${row.pid});`);
  }
  
  await pool.end();
}
main().catch(console.error);
