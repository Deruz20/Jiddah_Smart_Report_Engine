import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(repoRoot, 'scratch', 'evidence');
const outputSqlPath = path.join(evidenceDir, 'generated-production-shape.sql');
const outputManifestPath = path.join(evidenceDir, 'production-policy-manifest.json');
const probeFiles = [
  path.join(evidenceDir, 'prod_probe_v3.3.0.txt'),
  path.join(evidenceDir, 'prod_followup_v3.3.0.txt'),
];

const expectedPolicyCounts = new Map(Object.entries({
  academic_terms: 4,
  activity_log: 2,
  activity_logs: 2,
  circular_classes: 1,
  circular_marks: 1,
  circular_results: 1,
  circular_subjects: 1,
  classes: 2,
  enrollments: 1,
  grading_criteria: 2,
  grading_remarks: 8,
  marks: 5,
  marks_audit_log: 0,
  marks_primary: 0,
  notifications: 2,
  nursery_assessments: 0,
  profiles: 3,
  report_templates: 0,
  school_settings: 3,
  signatures: 1,
  students: 3,
  subjects: 2,
  teacher_class_assignments: 0,
  teacher_initials: 2,
  teacher_invites: 0,
  teachers: 7,
  terms: 1,
  theology_classes: 1,
  theology_marks: 1,
  theology_results: 1,
  theology_subjects: 1,
  user_profiles: 3,
  users: 0,
}));

function parseProbeFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const sections = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*)\s*\|\s*$/);
    if (!match) continue;
    const section = match[1].trim();
    const payloadText = match[2].trim();
    if (!section || section === 'section' || /^[-: ]+$/.test(section)) continue;
    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch (error) {
      throw new Error(`Invalid JSON in ${path.basename(filePath)} section "${section}": ${error.message}`);
    }
    sections.set(section, payload);
  }
  return sections;
}

function loadProbe() {
  const sections = new Map();
  for (const filePath of probeFiles) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing ignored owner-run probe output: ${path.relative(repoRoot, filePath)}`);
    }
    for (const [name, payload] of parseProbeFile(filePath)) sections.set(name, payload);
  }
  return sections;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeExpression(expression) {
  return typeof expression === 'string' ? expression.replaceAll('\\n', '\n') : expression;
}

function policyRole(role) {
  return String(role).toLowerCase() === 'public' ? 'PUBLIC' : quoteIdentifier(role);
}

function policyReferencedColumns(policies) {
  const aliases = new Map();
  const expressions = policies.flatMap((policy) => [policy.qual, policy.with_check]).filter(Boolean);
  const reservedAliases = new Set([
    'as', 'where', 'on', 'left', 'right', 'full', 'inner', 'outer', 'cross',
    'join', 'group', 'order', 'limit', 'offset', 'union', 'except', 'intersect',
  ]);

  for (const expression of expressions) {
    const relationPattern = /\b(?:FROM|JOIN)\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*(?:(?:AS\s+)?("?([a-z_][a-z0-9_]*)"?))?/gi;
    for (const match of expression.matchAll(relationPattern)) {
      const table = match[1].toLowerCase();
      const possibleAlias = match[3]?.toLowerCase();
      aliases.set(table, table);
      if (possibleAlias && !reservedAliases.has(possibleAlias)) aliases.set(possibleAlias, table);
    }
  }

  const columnsByTable = new Map();
  for (const expression of expressions) {
    for (const match of expression.matchAll(/\b([a-z_][a-z0-9_]*)\s*\.\s*"?([a-z_][a-z0-9_]*)"?/gi)) {
      const table = aliases.get(match[1].toLowerCase());
      if (!table) continue;
      if (!columnsByTable.has(table)) columnsByTable.set(table, new Set());
      columnsByTable.get(table).add(match[2].toLowerCase());
    }
  }
  return columnsByTable;
}

function stubTableSql(tables, policies) {
  const columnsByTable = policyReferencedColumns(policies);
  const sqlType = (column) => {
    if (column === 'id' || column.endsWith('_id')) return 'uuid';
    if (column.startsWith('is_') || column.startsWith('has_')) return 'boolean';
    if (column.endsWith('_at')) return 'timestamptz';
    if (column.endsWith('_score') || column.endsWith('_mark')) return 'numeric';
    return 'text';
  };

  return tables.map(({ table_name: table }) => {
    const referencedColumns = [...(columnsByTable.get(table) ?? [])].sort();
    if (referencedColumns.length === 0) referencedColumns.push('id');
    const definitions = referencedColumns.map((column) =>
      `  ${quoteIdentifier(column)} ${sqlType(column)}`
    ).join(',\n');
    return `CREATE TABLE IF NOT EXISTS public.${quoteIdentifier(table)} (\n${definitions}\n);`;
  }).join('\n');
}

function validateProbe(sections) {
  const metadata = sections.get('metadata');
  const tables = sections.get('rls_status');
  const policies = sections.get('policies');
  const grants = sections.get('grants');
  const constraints = sections.get('teachers_check_constraints');
  const columns = sections.get('columns');

  if (!metadata || metadata.probe_version !== 'v3.3.0') {
    throw new Error('Probe metadata is not v3.3.0; refusing to generate rehearsal SQL.');
  }
  if (!Array.isArray(tables) || !Array.isArray(policies) || !Array.isArray(grants) || !Array.isArray(constraints) || !Array.isArray(columns)) {
    throw new Error('Probe is missing required rls_status, policies, grants, columns, or teachers_check_constraints sections.');
  }

  const actualTableNames = tables.map((row) => row.table_name).sort();
  const expectedTableNames = [...expectedPolicyCounts.keys()].sort();
  if (JSON.stringify(actualTableNames) !== JSON.stringify(expectedTableNames)) {
    throw new Error('Probe table inventory differs from the owner-provided 33-table production inventory.');
  }
  if (tables.some((row) => row.rls_enabled !== true)) {
    throw new Error('Probe reports a production table without RLS enabled.');
  }

  const actualCounts = new Map();
  for (const policy of policies) actualCounts.set(policy.tablename, (actualCounts.get(policy.tablename) ?? 0) + 1);
  const mismatches = [...expectedPolicyCounts].filter(([table, count]) => (actualCounts.get(table) ?? 0) !== count);
  const unexpectedPolicyTables = [...actualCounts.keys()].filter((table) => !expectedPolicyCounts.has(table));
  if (mismatches.length || unexpectedPolicyTables.length) {
    throw new Error(`Probe policy counts differ from production facts: ${mismatches.map(([table, count]) => `${table}=${actualCounts.get(table) ?? 0}/${count}`).join(', ') || 'none'}; unexpected=${unexpectedPolicyTables.join(', ') || 'none'}`);
  }

  if (grants.some((grant) => grant.grantee === 'anon')) {
    throw new Error('Probe reports anon table privileges; refusing to generate a conflicting rehearsal.');
  }
  const authenticatedPrivileges = new Set(grants.filter((grant) => grant.grantee === 'authenticated').map((grant) => grant.privilege_type));
  const requiredPrivileges = ['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'];
  if (requiredPrivileges.some((privilege) => !authenticatedPrivileges.has(privilege))) {
    throw new Error('Probe does not confirm the expected full authenticated table privileges.');
  }

  const constraintNames = new Set(constraints.map((constraint) => constraint.name));
  if (!constraintNames.has('teachers_role_check') || !constraintNames.has('teachers_status_check')) {
    throw new Error('Probe is missing one or more teachers role/status check constraints.');
  }
  if (constraints.some((constraint) => !/^CHECK\s*\(/i.test(constraint.def ?? ''))) {
    throw new Error('Probe contains an unexpected teachers constraint definition.');
  }

  return {
    tables,
    policies: policies.map((policy) => ({
      ...policy,
      qual: normalizeExpression(policy.qual),
      with_check: normalizeExpression(policy.with_check),
    })),
    grants,
    columns,
    constraints,
  };
}

function renderSql({ tables, policies, grants, columns, constraints }) {
  const expectedTablesSql = tables
    .map((row) => `    ${sqlLiteral(row.table_name)}`)
    .join(',\n');

  const dropPolicies = `
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;`;

  const enableRls = tables
    .map((row) => `ALTER TABLE public.${quoteIdentifier(row.table_name)} ENABLE ROW LEVEL SECURITY;`)
    .join('\n');

  const createPolicies = policies.map((policy) => {
    const roles = (policy.roles ?? []).map(policyRole).join(', ') || 'PUBLIC';
    let statement = `CREATE POLICY ${quoteIdentifier(policy.policyname)}\n`;
    statement += `ON public.${quoteIdentifier(policy.tablename)}\n`;
    statement += `AS ${policy.permissive === 'RESTRICTIVE' ? 'RESTRICTIVE' : 'PERMISSIVE'}\n`;
    statement += `FOR ${policy.cmd}\nTO ${roles}`;
    if (policy.qual !== null && policy.qual !== undefined) statement += `\nUSING (${policy.qual})`;
    if (policy.with_check !== null && policy.with_check !== undefined) statement += `\nWITH CHECK (${policy.with_check})`;
    return `${statement};`;
  }).join('\n\n');

  const groupedGrants = new Map();
  for (const grant of grants) {
    const key = `${grant.table_name}\u0000${grant.grantee}\u0000${grant.is_grantable}`;
    if (!groupedGrants.has(key)) groupedGrants.set(key, []);
    groupedGrants.get(key).push(grant.privilege_type);
  }
  const revokeGrants = tables.map((row) =>
    `REVOKE ALL PRIVILEGES ON TABLE public.${quoteIdentifier(row.table_name)} FROM anon, authenticated;`
  ).join('\n');
  const createGrants = [...groupedGrants.entries()].map(([key, privileges]) => {
    const [table, grantee, grantable] = key.split('\u0000');
    const option = grantable === 'YES' || grantable === true ? ' WITH GRANT OPTION' : '';
    return `GRANT ${[...new Set(privileges)].sort().join(', ')} ON TABLE public.${quoteIdentifier(table)} TO ${quoteIdentifier(grantee)}${option};`;
  }).join('\n');

  const checkConstraintSql = constraints.map((constraint) => {
    return `ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS ${quoteIdentifier(constraint.name)};\nALTER TABLE public.teachers ADD CONSTRAINT ${quoteIdentifier(constraint.name)} ${constraint.def};`;
  }).join('\n');
  const createStubs = stubTableSql(tables, policies);
  const referencedColumns = policyReferencedColumns(policies);
  const addReferencedColumns = [...referencedColumns.entries()]
    .flatMap(([table, names]) => [...names].sort().map((column) =>
      `ALTER TABLE public.${quoteIdentifier(table)} ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column)} ${sqlTypeForColumn(column, columns)};`
    ))
    .join('\n');

  return `-- Generated locally from ignored owner-run production probe v3.3.0.
-- DO NOT APPLY TO PRODUCTION. Rehearsal only.
BEGIN;

${dropPolicies}

-- Create only minimal tables/columns needed to compile production policy expressions.
${createStubs}
${addReferencedColumns}

-- Assert that the rehearsal table set was aligned before restoring exact policies.
DO $$
DECLARE
  expected text[] := ARRAY[
${expectedTablesSql}
  ];
  actual text[];
BEGIN
  SELECT COALESCE(array_agg(tablename ORDER BY tablename), ARRAY[]::text[])
  INTO actual
  FROM pg_tables
  WHERE schemaname = 'public';
  IF actual IS DISTINCT FROM (SELECT array_agg(expected_table.name ORDER BY expected_table.name) FROM unnest(expected) AS expected_table(name)) THEN
    RAISE EXCEPTION 'Rehearsal table list differs from owner production probe';
  END IF;
END $$;

${enableRls}

${checkConstraintSql}

${revokeGrants}

${createGrants}

${createPolicies}

COMMIT;

NOTIFY pgrst, 'reload schema';
`;
}

function sqlTypeForColumn(column, columns) {
  const probeColumn = columns.find((item) => item.column_name === column);
  if (probeColumn) {
    const knownTypes = new Set([
      'uuid', 'text', 'boolean', 'integer', 'numeric', 'date',
      'timestamp with time zone', 'timestamp without time zone',
    ]);
    if (knownTypes.has(probeColumn.data_type)) {
      return probeColumn.data_type === 'timestamp with time zone'
        ? 'timestamptz'
        : probeColumn.data_type === 'timestamp without time zone'
          ? 'timestamp'
          : probeColumn.data_type;
    }
  }
  if (column === 'id' || column.endsWith('_id')) return 'uuid';
  if (column.startsWith('is_') || column.startsWith('has_')) return 'boolean';
  if (column.endsWith('_at')) return 'timestamptz';
  if (column.endsWith('_score') || column.endsWith('_mark')) return 'numeric';
  return 'text';
}

const sections = loadProbe();
const normalized = validateProbe(sections);
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(outputSqlPath, renderSql(normalized), 'utf8');
fs.writeFileSync(outputManifestPath, JSON.stringify(normalized.policies, null, 2), 'utf8');
console.log(`Validated ${normalized.tables.length} production tables, ${normalized.policies.length} policies, ${normalized.grants.length} grants, and ${normalized.constraints.length} teacher checks.`);
console.log(`Generated rehearsal-only SQL: ${path.relative(repoRoot, outputSqlPath)}`);
