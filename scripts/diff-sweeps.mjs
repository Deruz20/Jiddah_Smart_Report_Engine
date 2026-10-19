import fs from 'node:fs';
import path from 'node:path';

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error('Usage: node scripts/diff-sweeps.mjs <sweepA.json> <sweepB.json>');
  process.exit(1);
}

const dataA = JSON.parse(fs.readFileSync(path.resolve(fileA), 'utf8'));
const dataB = JSON.parse(fs.readFileSync(path.resolve(fileB), 'utf8'));

const resultsA = dataA.results || [];
const resultsB = dataB.results || [];

const mapA = new Map();
for (const r of resultsA) {
  mapA.set(`${r.method} ${r.endpoint} | ${r.role}`, r);
}

const mapB = new Map();
for (const r of resultsB) {
  mapB.set(`${r.method} ${r.endpoint} | ${r.role}`, r);
}

const allKeys = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

console.log('=== SWEEP CHANGED CELLS COMPARISON ===');
let changeCount = 0;

for (const k of allKeys) {
  const itemA = mapA.get(k);
  const itemB = mapB.get(k);

  const statusA = itemA?.statusCode;
  const statusB = itemB?.statusCode;

  if (statusA !== statusB) {
    changeCount++;
    console.log(`[CHANGED] ${k}: Baseline Status = ${statusA} -> HEAD Status = ${statusB}`);
  }
}

if (changeCount === 0) {
  console.log('No changed cells found between sweeps (all cells identical).');
} else {
  console.log(`\nTotal changed cells: ${changeCount}`);
}
