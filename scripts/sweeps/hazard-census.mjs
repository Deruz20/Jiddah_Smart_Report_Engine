import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const ARTIFACTS_DIR = path.resolve(ROOT_DIR, '../jiddah_agent_artifacts/sweeps');

const SCAN_DIRS = [
  ROOT_DIR,
  path.join(ROOT_DIR, 'scripts'),
  path.join(ROOT_DIR, 'scratch'),
  path.join(ROOT_DIR, 'supabase'),
];

const HAZARD_PATTERNS = [
  { id: 'supabase_link', severity: 'CRITICAL', label: 'Remote supabase link attempt', regex: /supabase\s+link/gi },
  { id: 'supabase_db_push', severity: 'CRITICAL', label: 'Remote DB push command', regex: /supabase\s+db\s+push/gi },
  { id: 'supabase_db_reset', severity: 'HIGH', label: 'Database reset command', regex: /supabase\s+db\s+reset/gi },
  { id: 'supabase_linked_flag', severity: 'CRITICAL', label: '--linked flag targeting remote project', regex: /--linked\b/gi },
  { id: 'supabase_functions_deploy', severity: 'HIGH', label: 'Remote function deploy', regex: /functions\s+deploy/gi },
  { id: 'prisma_migrate_dev', severity: 'HIGH', label: 'Prisma migrate dev command', regex: /prisma\s+migrate\s+dev/gi },
  { id: 'prisma_db_push', severity: 'HIGH', label: 'Prisma db push command', regex: /prisma\s+db\s+push/gi },
  { id: 'remote_postgres_conn', severity: 'CRITICAL', label: 'Hardcoded remote postgres connection string', regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@(?!localhost|127\.0\.0\.1|::1)[^\/\s'"]+/gi },
  { id: 'remote_supabase_co', severity: 'HIGH', label: 'Remote supabase.co endpoint reference', regex: /https:\/\/[a-z0-9_-]+\.supabase\.co/gi },
];

function scanFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  if (/node_modules|\.next|\.git|jiddah_recovery/.test(relPath)) return [];
  // Skip binary or huge files
  const stat = fs.statSync(filePath);
  if (stat.size > 2 * 1024 * 1024) return [];

  const findings = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const haz of HAZARD_PATTERNS) {
      const regex = new RegExp(haz.regex);
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNo = content.substring(0, match.index).split('\n').length;
        // Never print secrets or passwords in snippets; redact connection credentials
        let snippet = lines[lineNo - 1]?.trim().slice(0, 120) || '';
        snippet = snippet.replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@/gi, 'postgres://[REDACTED_AUTH]@');

        findings.push({
          file: relPath,
          line: lineNo,
          hazardId: haz.id,
          severity: haz.severity,
          label: haz.label,
          snippet,
        });
      }
    }
  } catch (err) {
    // Ignore read errors for binary files
  }
  return findings;
}

function walkDir(dir) {
  let findings = [];
  if (!fs.existsSync(dir)) return findings;
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (/node_modules|\.next|\.git|jiddah_recovery/.test(fullPath)) continue;

    if (entry.isDirectory()) {
      findings = findings.concat(walkDir(fullPath));
    } else if (/\.(js|mjs|ts|tsx|json|sh|ps1|toml|env|sql)$/.test(entry.name) || entry.name.startsWith('.env')) {
      findings = findings.concat(scanFile(fullPath));
    }
  }
  return findings;
}

let allHazards = [];

// Scan package.json specifically
const pkgPath = path.join(ROOT_DIR, 'package.json');
if (fs.existsSync(pkgPath)) {
  allHazards = allHazards.concat(scanFile(pkgPath));
}

// Scan directories
for (const dir of SCAN_DIRS) {
  if (dir === ROOT_DIR) {
    // Only top level files
    const topFiles = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
    for (const tf of topFiles) {
      if (tf.isFile() && /\.(js|mjs|ts|json|sh|ps1|toml)$/.test(tf.name)) {
        allHazards = allHazards.concat(scanFile(path.join(ROOT_DIR, tf.name)));
      }
    }
  } else {
    allHazards = allHazards.concat(walkDir(dir));
  }
}

// Deduplicate findings by file+line+hazardId
const uniqueKey = (h) => `${h.file}:${h.line}:${h.hazardId}`;
const seen = new Set();
const deduped = [];
for (const h of allHazards) {
  const k = uniqueKey(h);
  if (!seen.has(k)) {
    seen.add(k);
    deduped.push(h);
  }
}

const summary = {
  timestamp: new Date().toISOString(),
  totalHazardsFound: deduped.length,
  criticalHazards: deduped.filter((h) => h.severity === 'CRITICAL').length,
  highHazards: deduped.filter((h) => h.severity === 'HIGH').length,
  hazards: deduped,
};

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const outJson = path.join(ARTIFACTS_DIR, 'hazard_census_results.json');
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');

console.log('=== HAZARD CENSUS RESULTS ===');
console.log(`Total Hazard References Found: ${summary.totalHazardsFound}`);
console.log(`  - CRITICAL: ${summary.criticalHazards}`);
console.log(`  - HIGH: ${summary.highHazards}`);

if (deduped.length > 0) {
  console.log('\nHazard Findings (Redacted):');
  deduped.forEach((h) => {
    console.log(`  [${h.severity}] ${h.file}:${h.line} - ${h.label} -> ${h.snippet}`);
  });
}
console.log(`\nDetailed hazard census saved to: ${outJson}`);
