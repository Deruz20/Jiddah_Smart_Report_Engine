import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('================================================================');
console.log('PART A: WORKING-TREE GITLEAKS FINDINGS ANALYSIS (EXCLUDING GITIGNORED)');
console.log('================================================================\n');

const worktreeReportPath = path.resolve('scratch/evidence/h8_gitleaks_worktree.json');
if (!fs.existsSync(worktreeReportPath)) {
  console.error('Worktree report not found at:', worktreeReportPath);
  process.exit(1);
}

const allFindings = JSON.parse(fs.readFileSync(worktreeReportPath, 'utf8'));

// Filter out gitignored paths: .next, node_modules
const nonIgnoredFindings = allFindings.filter(f => {
  const norm = f.File.replace(/\\/g, '/');
  return !norm.startsWith('.next/') && !norm.includes('/.next/') &&
         !norm.startsWith('node_modules/') && !norm.includes('/node_modules/');
});

console.log(`Total findings in working tree: ${allFindings.length}`);
console.log(`Findings in gitignored paths (.next, node_modules): ${allFindings.length - nonIgnoredFindings.length}`);
console.log(`Findings in non-ignored paths: ${nonIgnoredFindings.length}\n`);

// Group by file and rule
const grouped = {};
for (const f of nonIgnoredFindings) {
  const fileKey = f.File.replace(/\\/g, '/');
  if (!grouped[fileKey]) grouped[fileKey] = {};
  if (!grouped[fileKey][f.RuleID]) grouped[fileKey][f.RuleID] = 0;
  grouped[fileKey][f.RuleID]++;
}

console.log('Grouped findings in non-ignored paths by file and rule:');
for (const [file, rules] of Object.entries(grouped)) {
  console.log(`  File: ${file}`);
  for (const [rule, count] of Object.entries(rules)) {
    console.log(`    - Rule: ${rule} (count: ${count})`);
  }
}

// List any finding in non-ignored file OTHER THAN .env.local
const otherThanEnvLocal = nonIgnoredFindings.filter(f => {
  const norm = f.File.replace(/\\/g, '/');
  return norm !== '.env.local' && !norm.endsWith('/.env.local');
});

console.log(`\nFindings in non-ignored files other than .env.local: ${otherThanEnvLocal.length}`);
if (otherThanEnvLocal.length === 0) {
  console.log('  -> NONE. Exactly zero leaked secrets exist in tracked/committed source code outside .env.local.');
} else {
  for (const f of otherThanEnvLocal) {
    console.log(`  - ${f.File}:${f.StartLine} [${f.RuleID}]`);
  }
}

console.log('\n================================================================');
console.log('PART B: JWT DECODING & CLASSIFICATION (LEGACY LEAKS #1-#9 & ACTIVE ANON)');
console.log('================================================================\n');

function decodeJwtSafe(jwtToken) {
  if (!jwtToken || typeof jwtToken !== 'string') return null;
  const parts = jwtToken.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return { header, payload };
  } catch {
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return { header, payload };
    } catch {
      return null;
    }
  }
}

function maskProjectRef(ref) {
  if (!ref || typeof ref !== 'string') return 'none';
  if (ref.length <= 6) return ref;
  return `${ref.substring(0, 4)}...${ref.substring(ref.length - 2)}`;
}

// Load legacy findings
const legacyReportPath = path.resolve('scratch/gitleaks_report.json');
let legacyFindings = [];
if (fs.existsSync(legacyReportPath)) {
  legacyFindings = JSON.parse(fs.readFileSync(legacyReportPath, 'utf8'));
}

const gitPath = 'C:\\Program Files\\Git\\cmd;' + (process.env.PATH || '');

// Process legacy leaks #1 - #9
for (let i = 0; i < Math.min(9, legacyFindings.length); i++) {
  const item = legacyFindings[i];
  let secret = '';
  try {
    const fileContent = execSync(`git show ${item.Commit}:${item.File}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, PATH: gitPath }
    });
    const lines = fileContent.split('\n');
    const targetLine = lines[item.StartLine - 1] || '';
    const m = targetLine.match(/['"](eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|sbp_[a-zA-Z0-9]+|[a-zA-Z0-9_-]{20,})['"]/);
    if (m) secret = m[1];
  } catch (err) {
    // ignore
  }

  const decoded = decodeJwtSafe(secret);
  console.log(`Legacy Leak #${i + 1}:`);
  console.log(`  Commit:     ${item.Commit.substring(0, 8)} (${item.File}:${item.StartLine})`);
  console.log(`  Rule:       ${item.RuleID}`);
  if (decoded) {
    const role = decoded.payload.role || 'n/a';
    const iss = decoded.payload.iss || 'n/a';
    const ref = decoded.payload.ref || (iss.includes('supabase') ? iss.replace(/^.*\/([^.]+)\..*$/, '$1') : 'n/a');
    const iat = decoded.payload.iat ? new Date(decoded.payload.iat * 1000).toISOString() : 'n/a';
    const exp = decoded.payload.exp ? new Date(decoded.payload.exp * 1000).toISOString() : 'n/a';
    const isServiceRole = role === 'service_role';
    console.log(`  JWT Role:   ${role}`);
    console.log(`  Issuer:     ${iss}`);
    console.log(`  Project Ref:${maskProjectRef(ref)}`);
    console.log(`  Issued At:  ${iat}`);
    console.log(`  Expires At: ${exp}`);
    console.log(`  Is Service: ${isServiceRole ? 'YES (CRITICAL)' : 'NO (public-by-design token)'}`);
  } else {
    console.log(`  Type:       Non-JWT token or unparseable format (${item.RuleID})`);
    console.log(`  Is Service: NO`);
  }
  console.log('');
}

// Active .env.local anon key
console.log('Active .env.local (Anon Key):');
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const anonMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*['"]?([^\r\n'"]+)/);
  if (anonMatch) {
    const activeAnon = anonMatch[1].trim();
    const decoded = decodeJwtSafe(activeAnon);
    if (decoded) {
      const role = decoded.payload.role || 'n/a';
      const iss = decoded.payload.iss || 'n/a';
      const ref = decoded.payload.ref || (iss.includes('supabase') ? iss.replace(/^.*\/([^.]+)\..*$/, '$1') : 'n/a');
      const iat = decoded.payload.iat ? new Date(decoded.payload.iat * 1000).toISOString() : 'n/a';
      const exp = decoded.payload.exp ? new Date(decoded.payload.exp * 1000).toISOString() : 'n/a';
      const isServiceRole = role === 'service_role';
      console.log(`  JWT Role:   ${role}`);
      console.log(`  Issuer:     ${iss}`);
      console.log(`  Project Ref:${maskProjectRef(ref)}`);
      console.log(`  Issued At:  ${iat}`);
      console.log(`  Expires At: ${exp}`);
      console.log(`  Is Service: ${isServiceRole ? 'YES (CRITICAL)' : 'NO (public-by-design anon token)'}`);
    } else {
      console.log('  Could not decode active anon key as JWT.');
    }
  } else {
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local.');
  }
} else {
  console.log('  .env.local file not found.');
}
