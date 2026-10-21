import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const ARTIFACTS_DIR = path.resolve(ROOT_DIR, '../jiddah_agent_artifacts/sweeps');

const SCAN_DIRS = [
  path.join(ROOT_DIR, 'src'),
  path.join(ROOT_DIR, 'scripts'),
  path.join(ROOT_DIR, 'supabase', 'migrations'),
];

// Canonical canonicalized roles targeted by the system
const CANONICAL_ROLES = [
  'admin',
  'head_teacher',
  'dos',
  'class_teacher',
  'theology_instructor',
  'teacher',
  'support_staff',
  'student',
  'parent',
  'guest',
];

// Regex looking for string literals or checks mentioning roles
const ROLE_PATTERNS = [
  /['"`](admin|administrator|super_admin|head\s*teacher|deputy\s*head\s*teacher|dos|class\s*teacher|theology\s*instructor|teacher|support\s*staff|bursar|student|parent|guest)['"`]/gi,
  /(?:role|role_name)\s*(?:===|==|!=|!==|LIKE|ILIKE|=)\s*['"`]([^'"`]+)['"`]/gi,
];

function getAllFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (/node_modules|\.next|dist/.test(fullPath)) continue;
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (/\.(tsx|ts|jsx|js|mjs|sql)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = SCAN_DIRS.flatMap(getAllFiles);
const roleOccurrences = [];
const rawRolesFound = new Map();

for (const file of allFiles) {
  const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    for (const pat of ROLE_PATTERNS) {
      let match;
      const regex = new RegExp(pat);
      while ((match = regex.exec(line)) !== null) {
        const rawRole = match[1];
        if (!rawRole || rawRole.length > 30) continue;
        const normalized = rawRole.trim().toLowerCase().replace(/[\s-]+/g, '_');

        const occ = {
          file: relPath,
          line: lineNo,
          rawLiteral: rawRole,
          normalizedRole: normalized,
          snippet: line.trim().slice(0, 120),
        };
        roleOccurrences.push(occ);

        if (!rawRolesFound.has(rawRole)) {
          rawRolesFound.set(rawRole, {
            rawLiteral: rawRole,
            normalized,
            count: 0,
            occurrences: [],
          });
        }
        const entry = rawRolesFound.get(rawRole);
        entry.count++;
        entry.occurrences.push({ file: relPath, line: lineNo });
      }
    }
  });
}

// Group variants by normalized role to detect collisions
const groupedByNormalized = {};
for (const [raw, info] of rawRolesFound.entries()) {
  const norm = info.normalized;
  if (!groupedByNormalized[norm]) {
    groupedByNormalized[norm] = [];
  }
  groupedByNormalized[norm].push(info);
}

// Collision candidates: any normalized role that has > 1 different string literal variant
const collisions = [];
for (const [norm, variants] of Object.entries(groupedByNormalized)) {
  if (variants.length > 1) {
    collisions.push({
      normalizedRole: norm,
      variantCount: variants.length,
      variants: variants.map((v) => ({
        rawLiteral: v.rawLiteral,
        count: v.count,
        sampleFiles: v.occurrences.slice(0, 3).map((o) => `${o.file}:${o.line}`),
      })),
    });
  }
}

const summary = {
  timestamp: new Date().toISOString(),
  totalFilesScanned: allFiles.length,
  totalRoleReferences: roleOccurrences.length,
  distinctRawLiterals: rawRolesFound.size,
  distinctNormalizedRoles: Object.keys(groupedByNormalized).length,
  collisions,
  allLiterals: Array.from(rawRolesFound.values()).sort((a, b) => b.count - a.count),
};

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const outJson = path.join(ARTIFACTS_DIR, 'role_literal_census_results.json');
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');

console.log('=== ROLE-LITERAL CENSUS RESULTS ===');
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Total role references found: ${summary.totalRoleReferences}`);
console.log(`Distinct raw literals: ${summary.distinctRawLiterals}`);
console.log(`Role collision groups: ${collisions.length}`);

if (collisions.length > 0) {
  console.log('\nRole Collisions / Casing & Naming Variants:');
  collisions.forEach((c) => {
    console.log(`  - Normalized Role [${c.normalizedRole}]:`);
    c.variants.forEach((v) => {
      console.log(`      * "${v.rawLiteral}" (${v.count}x) e.g. ${v.sampleFiles.join(', ')}`);
    });
  });
}

console.log(`\nDetailed census saved to: ${outJson}`);
