import fs from 'fs';
import path from 'path';

const prodCatalog = JSON.parse(fs.readFileSync('scratch/production_catalog.json', 'utf8'));

// 1. List production tables
const prodTables = prodCatalog.tables.map(t => t.table).sort();
console.log('Production Tables Count:', prodTables.length);
console.log('Production Tables:', prodTables.join(', '));

// 2. Read all repo migrations
const migrationsDir = path.resolve('supabase/migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
console.log('\nMigration Files:', migrationFiles);

// Extract tables created in repo migrations
const migrationTables = new Set();
for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const matches = sql.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)/gi);
  for (const m of matches) {
    migrationTables.add(m[1]);
  }
}
console.log('\nRepo Migration Created Tables:', Array.from(migrationTables).sort().join(', '));

// 3. Scan codebase for table names referenced via .from('table_name')
const srcDir = path.resolve('src');
function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs')) {
      results.push(full);
    }
  }
  return results;
}

const codeFiles = getFiles(srcDir);
const codeTables = new Set();
for (const f of codeFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g);
  for (const m of matches) {
    codeTables.add(m[1]);
  }
}
console.log('\nCodebase Referenced Tables (.from(...)):', Array.from(codeTables).sort().join(', '));

// Output drift comparison
const allTables = Array.from(new Set([...prodTables, ...migrationTables, ...codeTables])).sort();
const comparison = allTables.map(t => ({
  table: t,
  in_production: prodTables.includes(t),
  in_repo_migrations: migrationTables.has(t),
  in_codebase: codeTables.has(t)
}));

fs.writeFileSync('scratch/table_drift_analysis.json', JSON.stringify(comparison, null, 2));
console.log('\nWrote drift analysis to scratch/table_drift_analysis.json');
