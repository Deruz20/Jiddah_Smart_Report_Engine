import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const ARTIFACTS_DIR = path.resolve(ROOT_DIR, '../jiddah_agent_artifacts/sweeps');

const SCAN_DIRS = [
  path.join(SRC_DIR, 'app'),
  path.join(SRC_DIR, 'components'),
];

const IGNORE_PATTERNS = [
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  /node_modules/,
  /\.next/,
];

function getAllFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (IGNORE_PATTERNS.some((p) => p.test(fullPath))) continue;
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const PATTERNS = [
  { id: 'hash_href', label: 'Empty or hash href (href="#")', regex: /href\s*=\s*['"]#['"]/g },
  { id: 'empty_href', label: 'Empty string href (href="")', regex: /href\s*=\s*['"]['"]/g },
  { id: 'empty_onclick', label: 'Empty onClick handler (()=>{})', regex: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g },
  { id: 'noop_onclick', label: 'No-op onClick handler (void/undefined)', regex: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*(?:void\s+0|undefined)\s*\}/g },
  { id: 'console_only_handler', label: 'Handler only calls console.log/warn', regex: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*console\.(?:log|warn|debug)\s*\([^)]*\)\s*\}/g },
  { id: 'todo_comment', label: 'TODO marker in UI component', regex: /\/\/\s*TODO:?[^\n]*/gi },
  { id: 'fixme_comment', label: 'FIXME marker in UI component', regex: /\/\/\s*FIXME:?[^\n]*/gi },
];

const findings = [];
const allFiles = SCAN_DIRS.flatMap(getAllFiles);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

  for (const pat of PATTERNS) {
    let match;
    const regex = new RegExp(pat.regex);
    while ((match = regex.exec(content)) !== null) {
      const lineNo = content.substring(0, match.index).split('\n').length;
      const snippet = lines[lineNo - 1]?.trim().slice(0, 120) || '';
      findings.push({
        file: relPath,
        line: lineNo,
        ruleId: pat.id,
        ruleLabel: pat.label,
        matched: match[0],
        snippet,
      });
    }
  }
}

// Generate summary report
const summary = {
  timestamp: new Date().toISOString(),
  totalFilesScanned: allFiles.length,
  totalFindings: findings.length,
  findingsByRule: PATTERNS.map((p) => ({
    ruleId: p.id,
    label: p.label,
    count: findings.filter((f) => f.ruleId === p.id).length,
  })),
  findings,
};

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const outJson = path.join(ARTIFACTS_DIR, 'dead_control_sweep_results.json');
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');

console.log('=== DEAD CONTROL SWEEP RESULTS ===');
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Total dead controls / TODOs found: ${findings.length}`);
for (const r of summary.findingsByRule) {
  if (r.count > 0) {
    console.log(`  - [${r.label}]: ${r.count}`);
  }
}

if (findings.length > 0) {
  console.log('\nTop Findings:');
  findings.slice(0, 20).forEach((f) => {
    console.log(`  ${f.file}:${f.line} [${f.ruleId}] -> ${f.snippet}`);
  });
}
console.log(`\nDetailed findings saved to: ${outJson}`);
