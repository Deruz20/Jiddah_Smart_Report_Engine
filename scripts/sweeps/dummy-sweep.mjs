import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const ARTIFACTS_DIR = path.resolve(ROOT_DIR, '../jiddah_agent_artifacts/sweeps');

const SCAN_DIRS = [
  path.join(SRC_DIR, 'app'),
  path.join(SRC_DIR, 'components'),
  path.join(SRC_DIR, 'lib'),
  path.join(SRC_DIR, 'utils'),
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
    } else if (/\.(tsx|ts|jsx|js|mjs)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const PATTERNS = [
  { id: 'math_random', label: 'Math.random() usage', regex: /Math\.random\s*\(/g },
  { id: 'faker_import', label: 'Faker library usage', regex: /from\s+['"](?:@faker-js\/faker|faker)['"]/g },
  { id: 'mock_dummy_array', label: 'Mock/dummy/sample data array', regex: /(?:const|let|var)\s+(?:mock|dummy|sample|fake)[A-Za-z0-9_]*\s*=\s*\[/gi },
  { id: 'lorem_ipsum', label: 'Lorem ipsum placeholder text', regex: /lorem\s+ipsum/gi },
  { id: 'placeholder_names', label: 'Generic placeholder names', regex: /['"`](?:John Doe|Jane Doe|Test Student|Alice Smith|Bob Johnson)['"`]/gi },
  { id: 'fake_settimeout_save', label: 'Fake setTimeout save / delay without async operation', regex: /setTimeout\s*\(\s*\(\)\s*=>\s*\{[^}]*(?:toast\.(?:success|info)|setSaving\(false\)|setIsSaving\(false\))/g },
  { id: 'mock_fetch', label: 'Mock fetch simulation', regex: /new\s+Promise\s*\(\s*(?:resolve|res)\s*=>\s*setTimeout\s*\(\s*(?:resolve|res)/g },
  { id: 'hardcoded_dashboard_metrics', label: 'Hardcoded stat card metric value', regex: /<(?:p|span|div|h[1-6])[^>]*>\s*(?:\$|UGX|%|\d{2,3}%)\s*<\/(?:p|span|div|h[1-6])>/gi },
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
      // Find line number
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
const outJson = path.join(ARTIFACTS_DIR, 'dummy_sweep_results.json');
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');

console.log('=== DUMMY SWEEP RESULTS ===');
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Total potential dummy/placeholder artifacts found: ${findings.length}`);
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
