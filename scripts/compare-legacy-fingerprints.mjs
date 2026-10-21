import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { execSync } from 'child_process';

function getSha256Prefix(value) {
  if (!value) return 'none';
  return crypto.createHash('sha256').update(value.trim()).digest('hex').substring(0, 16);
}

// 1. Load the 10 legacy findings from scratch/gitleaks_report.json
const gitleaksPath = path.resolve('scratch/gitleaks_report.json');
let legacyFindings = [];
if (fs.existsSync(gitleaksPath)) {
  legacyFindings = JSON.parse(fs.readFileSync(gitleaksPath, 'utf8'));
}

console.log('=== COMPARISON OF .env* KEY FINGERPRINTS AGAINST 10 LEGACY LEAK FINGERPRINTS ===\n');

// 2. Extract SHA256 prefix for each legacy secret from git show
const legacyPrefixes = [];
for (let i = 0; i < legacyFindings.length; i++) {
  const item = legacyFindings[i];
  try {
    const gitPath = 'C:\\Program Files\\Git\\cmd;' + (process.env.PATH || '');
    const fileContent = execSync(`git show ${item.Commit}:${item.File}`, { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, PATH: gitPath }
    });
    const lines = fileContent.split('\n');
    const targetLine = lines[item.StartLine - 1] || '';
    
    // Extract token / secret value
    let secret = '';
    const m = targetLine.match(/['"](eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|sbp_[a-zA-Z0-9]+|[a-zA-Z0-9_-]{20,})['"]/);
    if (m) {
      secret = m[1];
    }
    const prefix = secret ? getSha256Prefix(secret) : 'unextracted';
    legacyPrefixes.push({
      index: i + 1,
      fingerprint: item.Fingerprint,
      commit: item.Commit.substring(0, 8),
      file: item.File,
      rule: item.RuleID,
      sha256Prefix: prefix
    });
  } catch (err) {
    legacyPrefixes.push({
      index: i + 1,
      fingerprint: item.Fingerprint,
      commit: item.Commit.substring(0, 8),
      file: item.File,
      rule: item.RuleID,
      sha256Prefix: 'git-show-err'
    });
  }
}

console.log('--- 10 LEGACY HISTORICAL LEAK FINGERPRINTS ---');
for (const leg of legacyPrefixes) {
  console.log(`[#${leg.index}] Commit ${leg.commit} | ${leg.file.padEnd(35)} | Rule: ${leg.rule.padEnd(16)} | Legacy SHA-256: ${leg.sha256Prefix}...`);
}
console.log('\n--------------------------------------------------------------------------------\n');

// 3. Inspect active .env* files
const envFiles = [
  '.env.local',
  '.env',
  '.env.production',
  '.env.development'
];

console.log('--- ACTIVE .env* FILES AUDIT & MATCH STATUS ---');
let totalChecked = 0;
let totalMatches = 0;

for (const envFile of envFiles) {
  const fullPath = path.resolve(envFile);
  if (!fs.existsSync(fullPath)) continue;

  console.log(`File: ${envFile}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const keyName = trimmed.substring(0, eqIdx).trim();
    const rawVal = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

    if (keyName.includes('KEY') || keyName.includes('TOKEN') || keyName.includes('SECRET')) {
      totalChecked++;
      const currentPrefix = getSha256Prefix(rawVal);
      
      // Compare against all 10 legacy prefixes
      const matchedLegacy = legacyPrefixes.filter(l => l.sha256Prefix !== 'unextracted' && l.sha256Prefix === currentPrefix);
      if (matchedLegacy.length > 0) {
        totalMatches++;
        const matchRefs = matchedLegacy.map(m => `#${m.index} (${m.commit})`).join(', ');
        console.log(`  - ${keyName.padEnd(35)} | SHA-256: ${currentPrefix}... | Status: MATCH (matches legacy ${matchRefs})`);
      } else {
        console.log(`  - ${keyName.padEnd(35)} | SHA-256: ${currentPrefix}... | Status: NO-MATCH (unique / rotated)`);
      }
    }
  }
  console.log('');
}

console.log(`Summary: ${totalChecked} active keys inspected. Matches against legacy leaks: ${totalMatches}.`);
