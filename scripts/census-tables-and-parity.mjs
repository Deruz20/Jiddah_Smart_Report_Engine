import fs from 'node:fs';
import path from 'node:path';

const catalogPath = 'C:/Users/USER/Desktop/school_management_system/jiddah_agent_artifacts/production_catalog.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

console.log('=== PRODUCTION CATALOG STRUCTURE ===');
console.log('Total Tables in Production:', catalog.tables.length);

const productionTables = catalog.tables.map(t => ({
  name: t.table || t.name,
  kind: t.kind === 'r' ? 'physical_table' : (t.kind === 'v' ? 'view' : t.kind),
  rls: t.rls,
  forced: t.forced
}));

console.log(JSON.stringify(productionTables, null, 2));

// PowerSync schema tables
const powerSyncSchemaPath = path.resolve('src/lib/powersync/AppSchema.ts');
const powerSyncContent = fs.readFileSync(powerSyncSchemaPath, 'utf8');
const powerSyncTables = [];
const psMatches = powerSyncContent.matchAll(/new Table\(\s*'([^']+)'/g);
for (const m of psMatches) {
  powerSyncTables.push(m[1]);
}
console.log('\n=== POWERSYNC SCHEMA TABLES ===');
console.log(powerSyncTables);

// Scan src directory for table references in .from('table_name')
function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scanDir(full, fileList);
    } else if (/\.(ts|tsx|js|mjs)$/.test(f)) {
      fileList.push(full);
    }
  }
  return fileList;
}

const allSrcFiles = scanDir(path.resolve('src'));
const tableUsageMap = {};

for (const t of productionTables) {
  tableUsageMap[t.name] = {
    name: t.name,
    kind: t.kind,
    rls: t.rls,
    inPowerSync: powerSyncTables.includes(t.name),
    usedInSrc: [],
    clientTypes: new Set()
  };
}

for (const file of allSrcFiles) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const code = fs.readFileSync(file, 'utf8');
  
  for (const t of productionTables) {
    const regex = new RegExp(`\\.from\\(['"\`]${t.name}['"\`]\\)`, 'g');
    if (regex.test(code)) {
      tableUsageMap[t.name].usedInSrc.push(rel);
      if (code.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        tableUsageMap[t.name].clientTypes.add('service_role');
      }
      if (code.includes('cookies()') || code.includes('createServerClient') || code.includes('useSupabase') || code.includes('createBrowserClient')) {
        tableUsageMap[t.name].clientTypes.add('user_session');
      }
      if (code.includes('getSupabaseAnonKey') || code.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
        tableUsageMap[t.name].clientTypes.add('anon');
      }
    }
  }
}

console.log('\n=== TABLE USAGE CENSUS ===');
const censusResult = Object.values(tableUsageMap).map(u => ({
  table: u.name,
  kind: u.kind,
  rls: u.rls,
  status: u.usedInSrc.length > 0 || u.inPowerSync ? 'IN_USE' : 'LEGACY',
  inPowerSync: u.inPowerSync,
  srcOccurrencesCount: u.usedInSrc.length,
  clientTypes: Array.from(u.clientTypes),
  files: u.usedInSrc.slice(0, 5) // top 5
}));

console.log(JSON.stringify(censusResult, null, 2));

fs.writeFileSync('scratch/table_census_output.json', JSON.stringify(censusResult, null, 2));
