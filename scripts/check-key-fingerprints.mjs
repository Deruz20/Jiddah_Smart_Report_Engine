import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

function getSha256Prefix(value) {
  if (!value) return 'none';
  return crypto.createHash('sha256').update(value.trim()).digest('hex').substring(0, 16);
}

const envFiles = [
  '.env.local',
  '.env',
  '.env.production',
  '.env.development',
  '../.env.local'
];

console.log('=== SHA-256 KEY FINGERPRINT AUDIT (NO KEY MATERIAL PRINTED) ===\n');

for (const envFile of envFiles) {
  const fullPath = path.resolve(envFile);
  if (!fs.existsSync(fullPath)) continue;

  console.log(`Inspecting: ${envFile}`);
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
      const shaPrefix = getSha256Prefix(rawVal);
      console.log(`  - Variable: ${keyName.padEnd(35)} | SHA-256 Prefix: ${shaPrefix}... (len: ${rawVal.length})`);
    }
  }
  console.log('');
}
