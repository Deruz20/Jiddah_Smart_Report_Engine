import { execSync } from 'node:child_process';

const CONTAINER = 'supabase_db_rehearsal_isolated_supabase';
const LOW_PRIV_USER = '6fa698d7-9f7b-4e4a-a2a6-b000ebd66dc8'; // Support Staff

const TABLES = [
  'students',
  'circular_marks',
  'theology_marks',
  'school_settings',
  'teachers',
  'academic_terms',
  'activity_logs',
  'circular_classes',
  'enrollments',
  'notifications',
  'notification_reads',
  'theology_classes'
];

function runSql(sql) {
  const b64 = Buffer.from(sql).toString('base64');
  const cmd = `docker exec -i ${CONTAINER} sh -c "echo ${b64} | base64 -d | psql -U postgres -d postgres 2>&1"`;
  try {
    const out = execSync(cmd, { encoding: 'utf8' });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: err.stdout?.toString('utf8') || err.message };
  }
}

console.log('========================================================================');
console.log('  EXPOSURE AUDIT: Testing SELECT, INSERT, UPDATE, DELETE for anon & user');
console.log('========================================================================\n');

const results = [];

for (const t of TABLES) {
  const rowResult = {
    table: t,
    anon: {},
    authenticated: {}
  };

  // 1. Anon tests
  // SELECT
  let sql = `BEGIN; SET LOCAL ROLE anon; SELECT 1 FROM public.${t} LIMIT 1; ROLLBACK;`;
  let r = runSql(sql);
  rowResult.anon.SELECT = r.ok && !r.out.includes('ERROR') ? 'ALLOWED' : 'DENIED';

  // INSERT
  sql = `BEGIN; SET LOCAL ROLE anon; INSERT INTO public.${t} DEFAULT VALUES; ROLLBACK;`;
  r = runSql(sql);
  // If failure is RLS or permission denied vs not-null constraint:
  if (r.out.includes('permission denied') || r.out.includes('violates row-level security')) {
    rowResult.anon.INSERT = 'DENIED';
  } else if (!r.ok && (r.out.includes('null value in column') || r.out.includes('violates not-null'))) {
    rowResult.anon.INSERT = 'ALLOWED (blocked only by NOT-NULL, not RLS/Grant)';
  } else if (r.ok && !r.out.includes('ERROR')) {
    rowResult.anon.INSERT = 'ALLOWED';
  } else {
    rowResult.anon.INSERT = r.out.includes('permission denied') ? 'DENIED' : 'DENIED (' + r.out.split('\n')[0] + ')';
  }

  // UPDATE
  sql = `BEGIN; SET LOCAL ROLE anon; UPDATE public.${t} SET id=id WHERE false; ROLLBACK;`;
  r = runSql(sql);
  rowResult.anon.UPDATE = r.ok && !r.out.includes('ERROR') ? 'ALLOWED' : 'DENIED';

  // DELETE
  sql = `BEGIN; SET LOCAL ROLE anon; DELETE FROM public.${t} WHERE false; ROLLBACK;`;
  r = runSql(sql);
  rowResult.anon.DELETE = r.ok && !r.out.includes('ERROR') ? 'ALLOWED' : 'DENIED';

  // 2. Low-Privilege Authenticated User tests
  // SELECT
  sql = `BEGIN; SELECT set_config('request.jwt.claim.sub', '${LOW_PRIV_USER}', true); SET LOCAL ROLE authenticated; SELECT 1 FROM public.${t} LIMIT 1; ROLLBACK;`;
  r = runSql(sql);
  rowResult.authenticated.SELECT = r.ok && !r.out.includes('ERROR') ? 'ALLOWED' : 'DENIED';

  // INSERT
  sql = `BEGIN; SELECT set_config('request.jwt.claim.sub', '${LOW_PRIV_USER}', true); SET LOCAL ROLE authenticated; INSERT INTO public.${t} DEFAULT VALUES; ROLLBACK;`;
  r = runSql(sql);
  if (r.out.includes('permission denied') || r.out.includes('violates row-level security')) {
    rowResult.authenticated.INSERT = 'DENIED';
  } else if (!r.ok && (r.out.includes('null value in column') || r.out.includes('violates not-null'))) {
    rowResult.authenticated.INSERT = 'ALLOWED (blocked only by NOT-NULL, not RLS/Grant)';
  } else if (r.ok && !r.out.includes('ERROR')) {
    rowResult.authenticated.INSERT = 'ALLOWED';
  } else {
    rowResult.authenticated.INSERT = r.out.includes('permission denied') ? 'DENIED' : 'DENIED (' + r.out.split('\n')[0] + ')';
  }

  // UPDATE
  sql = `BEGIN; SELECT set_config('request.jwt.claim.sub', '${LOW_PRIV_USER}', true); SET LOCAL ROLE authenticated; UPDATE public.${t} SET id=id WHERE false; ROLLBACK;`;
  r = runSql(sql);
  rowResult.authenticated.UPDATE = r.ok && !r.out.includes('ERROR') ? 'ALLOWED' : 'DENIED';

  // DELETE
  sql = `BEGIN; SELECT set_config('request.jwt.claim.sub', '${LOW_PRIV_USER}', true); SET LOCAL ROLE authenticated; DELETE FROM public.${t} WHERE false; ROLLBACK;`;
  r = runSql(sql);
  rowResult.authenticated.DELETE = r.ok && !r.out.includes('ERROR') ? 'ALLOWED' : 'DENIED';

  results.push(rowResult);
}

console.log(JSON.stringify(results, null, 2));
