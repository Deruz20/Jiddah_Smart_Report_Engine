import { execSync } from 'child_process';
import fs from 'fs';

const gitPath = 'C:\\Program Files\\Git\\cmd\\git.exe';
const files = execSync(`"${gitPath}" ls-files`, { encoding: 'utf8' })
  .split('\n')
  .map(f => f.trim())
  .filter(Boolean);

console.log(`Scanning ${files.length} git-tracked files for secrets...`);
let leakCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasSecretKey = content.includes('sb_secret_');
    const hasPublishableKey = content.includes('sb_publishable_');
    const hasJwt = /eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(content);

    if (hasSecretKey || hasPublishableKey || hasJwt) {
      console.log(`LEAK DETECTED in tracked file: ${file} (secretKey: ${hasSecretKey}, pubKey: ${hasPublishableKey}, jwt: ${hasJwt})`);
      leakCount++;
    }
  } catch (err) {
    // binary file or read error, ignore
  }
}

console.log(`VERIFICATION RESULT: Total leaks in tracked files: ${leakCount}`);
process.exit(leakCount === 0 ? 0 : 1);
