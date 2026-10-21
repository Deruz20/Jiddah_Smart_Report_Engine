import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates a rollback SQL script from probe v3 output JSON.
 * Recreates the exact theology_marks policies that existed at probe time.
 */
export function generateRollbackSql(probeJson) {
  const policies = probeJson.policies || [];
  const theologyPolicies = policies.filter(p => p.tablename === 'theology_marks');

  let sql = `-- AUTO-GENERATED ROLLBACK FROM PRODUCTION PROBE V3 OUTPUT
-- Generated at: ${new Date().toISOString()}

BEGIN;

-- 1. Drop forward migration policy
DROP POLICY IF EXISTS "theology_marks_manage_authorized_staff" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;

`;

  if (theologyPolicies.length === 0) {
    sql += `-- WARNING: No existing policies found for theology_marks in probe output.\n`;
  }

  for (const pol of theologyPolicies) {
    const rolesStr = Array.isArray(pol.roles) ? pol.roles.join(', ') : (pol.roles?.replace(/[{}]/g, '') || 'authenticated');
    const cmd = pol.cmd || 'ALL';
    
    sql += `-- Restore policy: "${pol.policyname}"\n`;
    sql += `CREATE POLICY "${pol.policyname}"\n`;
    sql += `ON public.theology_marks\n`;
    sql += `FOR ${cmd}\n`;
    sql += `TO ${rolesStr}\n`;
    if (pol.qual) {
      sql += `USING (\n  ${pol.qual}\n)\n`;
    }
    if (pol.with_check) {
      sql += `WITH CHECK (\n  ${pol.with_check}\n);\n\n`;
    } else {
      sql += `;\n\n`;
    }
  }

  sql += `COMMIT;\n`;
  return sql;
}

if (process.argv[1]?.endsWith('generate-rollback-from-probe.mjs')) {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('Usage: node scripts/generate-rollback-from-probe.mjs <probe_output.json>');
    process.exit(1);
  }

  let raw = fs.readFileSync(path.resolve(inputArg), 'utf8');
  // Strip BOM if present
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
  // If psql output contains BEGIN / ROLLBACK lines, extract the json line
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const jsonLine = lines.find(l => l.startsWith('{') && l.endsWith('}')) || raw;
  const probeData = JSON.parse(jsonLine);
  const sql = generateRollbackSql(probeData);
  console.log(sql);
}
