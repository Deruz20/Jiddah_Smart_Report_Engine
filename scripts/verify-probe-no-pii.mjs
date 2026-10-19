import fs from 'fs';
import path from 'path';

const probeOutputPath = path.resolve('scratch/evidence/probe_v3_rehearsal_output.json');
if (!fs.existsSync(probeOutputPath)) {
  console.error(`Probe output not found at ${probeOutputPath}`);
  process.exit(1);
}

const text = fs.readFileSync(probeOutputPath, 'utf8');

// 1. Count '@'
const atMatches = text.match(/@/g) || [];
console.log('Count of @ in probe JSON:', atMatches.length);

// 2. Count seeded names, emails, and domains
const seededTokens = [
  'admin@test.local',
  'Synthetic Admin',
  'head@test.local',
  'Synthetic Head Teacher',
  'dos@test.local',
  'Synthetic DOS',
  'teacher@test.local',
  'Synthetic Class Teacher',
  'theology@test.local',
  'Synthetic Theology',
  'staff@test.local',
  'Synthetic Support Staff',
  'test.local',
  'Test Student',
  'Unassigned Test Student'
];

console.log('Seeded token occurrence counts:');
let totalPIIFound = 0;
for (const token of seededTokens) {
  const re = new RegExp(token, 'gi');
  const count = (text.match(re) || []).length;
  console.log(`  ${token}: ${count}`);
  totalPIIFound += count;
}

if (atMatches.length > 0 || totalPIIFound > 0) {
  console.error(`[FAIL] Probe output contains PII! (@ count: ${atMatches.length}, seeded tokens: ${totalPIIFound})`);
  process.exit(1);
}

console.log('✔ PROBE PII SCAN PASS: ZERO @ characters and ZERO seeded PII found.');
