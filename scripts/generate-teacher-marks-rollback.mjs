import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const probePath = path.join(root, 'scratch', 'evidence', 'prod_probe_v3.3.0.txt');
const outputPath = path.join(root, 'supabase', 'hardening', '20261020_teacher_marks_scoping_rollback.sql');
const requiredPolicies = new Map([
  ['circular_marks_access_policy', 'circular_marks'],
  ['theology_marks_access_policy', 'theology_marks'],
]);

const probeText = fs.readFileSync(probePath, 'utf8').replace(/^\uFEFF/, '');
const policyLine = probeText.split(/\r?\n/).find((line) => /^\|\s*policies\s*\|/.test(line));
if (!policyLine) throw new Error('Probe has no policies section.');
const policyJson = policyLine.split('|')[2]?.trim();
if (!policyJson) throw new Error('Probe policies section is empty.');
const policies = JSON.parse(policyJson);

const sqlIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const sqlRole = (role) => String(role).toLowerCase() === 'public' ? 'PUBLIC' : sqlIdentifier(role);
const sqlExpression = (value) => String(value).replace(/\\n/g, '\n');
const restoreStatements = [];

for (const [name, table] of requiredPolicies) {
  const policy = policies.find((item) => item.policyname === name && item.tablename === table);
  if (!policy || policy.cmd !== 'ALL') {
    throw new Error(`Probe is missing the production ALL policy ${name} on ${table}.`);
  }
  const roles = (policy.roles ?? []).map(sqlRole).join(', ') || 'PUBLIC';
  const using = policy.qual == null ? '' : `\nUSING (${sqlExpression(policy.qual)})`;
  const check = policy.with_check == null ? '' : `\nWITH CHECK (${sqlExpression(policy.with_check)})`;
  restoreStatements.push(`CREATE POLICY ${sqlIdentifier(name)}
ON public.${sqlIdentifier(table)}
AS ${policy.permissive === 'RESTRICTIVE' ? 'RESTRICTIVE' : 'PERMISSIVE'}
FOR ALL
TO ${roles}${using}${check};`);
}

const rollback = `-- Generated from scratch/evidence/prod_probe_v3.3.0.txt.
-- DRAFT
-- DO NOT APPLY TO PRODUCTION
-- Rehearsal-only rollback. Restores both production mark policies verbatim.
BEGIN;

DROP POLICY IF EXISTS "teacher_class_assignments_self_select" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;
DROP POLICY IF EXISTS "circular_marks_access_policy" ON public.circular_marks;

${restoreStatements.join('\n\n')}

DROP FUNCTION IF EXISTS public.teacher_assigned(uuid, text);
DROP FUNCTION IF EXISTS public.current_teacher_ok();
DROP FUNCTION IF EXISTS public.current_teacher_id();

COMMIT;
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, rollback, 'utf8');
console.log(`Generated rehearsal-only rollback from ${path.relative(root, probePath)}.`);
console.log(`Restored policies: ${[...requiredPolicies.keys()].join(', ')}.`);
console.log(`Output: ${path.relative(root, outputPath)}.`);
