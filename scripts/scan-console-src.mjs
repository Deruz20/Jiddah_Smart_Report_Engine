import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk('src');
const out = [];
for (const f of files) {
  const rel = path.relative('.', f).replace(/\\/g, '/');
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('console.')) {
      out.push(`${rel}:${idx + 1}:${line.trim()}`);
    }
  });
}
fs.writeFileSync('scratch/console_matches_src.txt', out.join('\n'), 'utf8');
console.log(`Saved ${out.length} matches in UTF-8`);
