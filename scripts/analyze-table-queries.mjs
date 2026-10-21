import fs from 'node:fs';
import path from 'node:path';

function findFiles(dir, exts) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'scratch'].includes(f)) {
        res = res.concat(findFiles(full, exts));
      }
    } else if (exts.some(e => f.endsWith(e))) {
      res.push(full);
    }
  }
  return res;
}

const files = findFiles('src', ['.ts', '.tsx', '.js', '.jsx']);
const clientQueries = {};

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const isClient = content.includes('"use client"') || content.includes("'use client'");
  const isApi = f.includes(path.join('src', 'app', 'api'));

  const fromMatches = [...content.matchAll(/\.from\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g)];
  for (const m of fromMatches) {
    const table = m[1];
    if (!clientQueries[table]) clientQueries[table] = { clientSide: new Set(), serverSide: new Set() };
    if (isApi || !isClient) {
      clientQueries[table].serverSide.add(f);
    } else {
      clientQueries[table].clientSide.add(f);
    }
  }
}

const summary = {};
for (const [t, data] of Object.entries(clientQueries)) {
  summary[t] = {
    clientSideFiles: Array.from(data.clientSide),
    serverSideFiles: Array.from(data.serverSide),
    queriedDirectlyByBrowser: data.clientSide.size > 0
  };
}

console.log(JSON.stringify(summary, null, 2));
