import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getRehearsalCredentials } from './rehearsal-credentials.mjs';

const root = process.cwd();
const container = 'supabase_db_rehearsal_isolated_supabase';
const credentials = getRehearsalCredentials();
const target = new URL(credentials.apiUrl);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '54321') {
  throw new Error('Refusing to apply policy-cycle SQL outside the local rehearsal endpoint.');
}

const probePath = path.join(root, 'scratch', 'evidence', 'prod_probe_v3.3.0.txt');
const forwardPath = path.join(root, 'supabase', 'hardening', '20261020_teacher_marks_scoping.sql');
const rollbackPath = path.join(root, 'supabase', 'hardening', '20261020_teacher_marks_scoping_rollback.sql');
const probeText = fs.readFileSync(probePath, 'utf8').replace(/^\uFEFF/, '');
const policyLine = probeText.split(/\r?\n/).find((line) => /^\|\s*policies\s*\|/.test(line));
if (!policyLine) throw new Error('Production probe policies section is missing.');
const expectedPolicies = JSON.parse(policyLine.split('|')[2].trim());

function applySql(filePath) {
  execFileSync('docker', [
    'exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres',
  ], { input: fs.readFileSync(filePath), stdio: ['pipe', 'pipe', 'pipe'] });
}

function exportPolicies() {
  const query = `SELECT COALESCE(json_agg(json_build_object(
    'tablename', tablename,
    'policyname', policyname,
    'permissive', permissive,
    'roles', roles,
    'cmd', cmd,
    'qual', qual,
    'with_check', with_check
  ) ORDER BY tablename, policyname), '[]'::json)::text FROM pg_policies WHERE schemaname = 'public';`;
  const output = execFileSync('docker', [
    'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-P', 'pager=off', '-c', query,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output.trim());
}

function normalizeExpression(expression) {
  if (typeof expression !== 'string') return expression;
  return expression
    .replace(/\\n/g, '\n')
    .replace(/\(\((ARRAY\[.*?\])\)::text\[\]\)/gs, '($1)')
    .replace(/\(('(?:[^']|'')*'::character varying)\)::text/g, '$1');
}

function normalizePolicy(policy) {
  return {
    tablename: policy.tablename,
    policyname: policy.policyname,
    permissive: policy.permissive,
    roles: [...(policy.roles ?? [])].sort(),
    cmd: policy.cmd,
    qual: normalizeExpression(policy.qual),
    with_check: normalizeExpression(policy.with_check),
  };
}

function comparePolicies(actual) {
  const expectedByName = new Map(expectedPolicies.map((policy) => [policy.policyname, normalizePolicy(policy)]));
  const actualByName = new Map(actual.map((policy) => [policy.policyname, normalizePolicy(policy)]));
  const differences = [];
  for (const [name, expected] of expectedByName) {
    const observed = actualByName.get(name);
    if (!observed) differences.push(`${name}: missing`);
    else if (JSON.stringify(observed) !== JSON.stringify(expected)) {
      differences.push({ policyname: name, expected, actual: observed });
    }
  }
  for (const name of actualByName.keys()) {
    if (!expectedByName.has(name)) differences.push(`${name}: unexpected`);
  }
  return differences;
}

applySql(forwardPath);
console.log('FORWARD_APPLIED=1');
applySql(rollbackPath);
console.log('ROLLBACK_APPLIED=1');
const differences = comparePolicies(exportPolicies());
if (differences.length > 0) {
  console.error(`PRODUCTION_POLICY_DIFF=${JSON.stringify(differences)}`);
  throw new Error('Rollback did not restore production policy definitions.');
}
console.log('ROLLBACK_POLICY_DIFF=empty');
applySql(forwardPath);
console.log('FORWARD_REAPPLIED=1');
