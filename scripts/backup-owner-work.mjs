import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = path.resolve('C:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room');
const backupRoot = path.resolve('C:/Users/USER/Desktop/school_management_system/jiddah_owner_backup_20261021');

const gitEnv = {
  ...process.env,
  PATH: `${process.env.PATH || ''};C:\\Program Files\\Git\\cmd;C:\\Program Files\\Git\\bin;C:\\Users\\USER\\AppData\\Local\\Programs\\Git\\cmd`,
};

function runGit(args) {
  return execSync(`git ${args}`, { cwd: repoRoot, env: gitEnv, encoding: 'utf8' }).trim();
}

const modifiedRaw = runGit('ls-files -m');
const untrackedRaw = runGit('ls-files --others --exclude-standard');

const allFiles = Array.from(
  new Set(
    [...modifiedRaw.split(/\r?\n/), ...untrackedRaw.split(/\r?\n/)]
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .filter((f) => !f.startsWith('node_modules/') && !f.startsWith('.git/') && f !== 'scripts/backup-owner-work.mjs')
  )
).sort();

fs.mkdirSync(backupRoot, { recursive: true });

let copiedCount = 0;
const copiedFiles = [];

for (const relPath of allFiles) {
  const srcPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(srcPath)) continue;
  const stat = fs.statSync(srcPath);
  if (!stat.isFile()) continue;

  const destPath = path.join(backupRoot, relPath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  copiedCount++;
  copiedFiles.push(relPath);
}

const manifest = {
  timestamp: new Date().toISOString(),
  sourceRepo: repoRoot,
  backupDestination: backupRoot,
  branchAtBackup: runGit('rev-parse --abbrev-ref HEAD'),
  headCommitAtBackup: runGit('rev-parse HEAD'),
  totalFilesCopied: copiedCount,
  files: copiedFiles,
};

fs.writeFileSync(path.join(backupRoot, 'BACKUP_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Backup completed to: ${backupRoot}`);
console.log(`Total modified + untracked files copied: ${copiedCount}`);
