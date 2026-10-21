import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = path.resolve('C:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room');
const backupRoot = path.resolve('C:/Users/USER/Desktop/school_management_system/jiddah_owner_backup_20261021');
const recoveryRoot = path.resolve('C:/Users/USER/Desktop/school_management_system/jiddah_recovery_20261020');

const gitEnv = {
  ...process.env,
  PATH: `${process.env.PATH || ''};C:\\Program Files\\Git\\cmd;C:\\Program Files\\Git\\bin;C:\\Users\\USER\\AppData\\Local\\Programs\\Git\\cmd`,
};

function runGit(args, cwd = repoRoot) {
  return execSync(`git ${args}`, { cwd, env: gitEnv, encoding: 'utf8' }).trim();
}

// 1. Create or reset unified integration branch from origin/main, then merge fix/phase1-a-c-stabilize and recovery/teacher-access
const targetBranch = 'feat/unified-integration-20261021';
console.log(`Creating unified branch '${targetBranch}' from origin/main...`);
runGit(`checkout -f -B ${targetBranch} origin/main`);
console.log(`Merging fix/phase1-a-c-stabilize...`);
try {
  runGit(`merge --no-ff --no-edit -X theirs fix/phase1-a-c-stabilize`);
} catch (e) {
  console.log('Merge fix/phase1-a-c-stabilize status:', e.message);
}
console.log(`Merging verified commits from recovery/teacher-access...`);
try {
  runGit(`merge --no-ff --no-edit -X theirs recovery/teacher-access`);
} catch (e) {
  console.log('Merge recovery/teacher-access status:', e.message);
}

// 2. Copy all owner files from backupRoot first
const manifest = JSON.parse(fs.readFileSync(path.join(backupRoot, 'BACKUP_MANIFEST.json'), 'utf8'));
let ownerRestored = 0;
for (const relPath of manifest.files) {
  const src = path.join(backupRoot, relPath);
  const dest = path.join(repoRoot, relPath);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    ownerRestored++;
  }
}
console.log(`Restored ${ownerRestored} files from owner backup.`);

// 3. Copy all modified and untracked files from jiddah_recovery_20261020
const recModified = runGit('ls-files -m', recoveryRoot).split(/\r?\n/).filter(Boolean);
const recUntracked = runGit('ls-files --others --exclude-standard', recoveryRoot).split(/\r?\n/).filter(Boolean);
const recFiles = Array.from(new Set([...recModified, ...recUntracked])).sort();

let recoveryMerged = 0;
for (const relPath of recFiles) {
  const src = path.join(recoveryRoot, relPath);
  const dest = path.join(repoRoot, relPath);
  if (fs.existsSync(src) && fs.statSync(src).isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    recoveryMerged++;
  }
}
console.log(`Applied ${recoveryMerged} teacher-access files from jiddah_recovery_20261020.`);
console.log('Recovery files applied:', recFiles);
