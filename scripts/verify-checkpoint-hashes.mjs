import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const backupDir = 'C:\\Users\\USER\\Desktop\\school_management_system\\.checkpoints\\jiddah_autopilot_baseline_20261011_214820\\files';
const repoDir = 'C:\\Users\\USER\\Desktop\\school_management_system\\jiddah_repo_clean_room';

function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const files = walk(backupDir);
console.log(`Found ${files.length} backup files to compare.\n`);

const statusCounts = { IDENTICAL: 0, MODIFIED: 0, MISSING: 0 };
const modifiedFiles = [];

for (const f of files) {
  const relPath = path.relative(backupDir, f);
  const repoFile = path.join(repoDir, relPath);

  if (!fs.existsSync(repoFile)) {
    console.log(`[MISSING] ${relPath}`);
    statusCounts.MISSING++;
  } else {
    const h1 = sha256(f);
    const h2 = sha256(repoFile);
    if (h1 === h2) {
      statusCounts.IDENTICAL++;
    } else {
      statusCounts.MODIFIED++;
      modifiedFiles.push(relPath);
      console.log(`[MODIFIED] ${relPath}`);
    }
  }
}

console.log('\n--- Summary ---');
console.log(`Total compared: ${files.length}`);
console.log(`Identical: ${statusCounts.IDENTICAL}`);
console.log(`Modified: ${statusCounts.MODIFIED}`);
console.log(`Missing: ${statusCounts.MISSING}`);

if (modifiedFiles.length > 0) {
  console.log('\nModified files list:');
  modifiedFiles.forEach(m => console.log(' - ' + m));
}
