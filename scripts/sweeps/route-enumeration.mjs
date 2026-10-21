import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const APP_DIR = path.join(ROOT_DIR, 'src', 'app');
const ARTIFACTS_DIR = path.resolve(ROOT_DIR, '../jiddah_agent_artifacts/sweeps');

function getAllFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (/node_modules|\.next/.test(fullPath)) continue;
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const allAppFiles = getAllFiles(APP_DIR);

const routes = [];

for (const file of allAppFiles) {
  const relPath = path.relative(APP_DIR, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  // Check if it's a page or api route
  const isPage = path.basename(file).startsWith('page.');
  const isApiRoute = path.basename(file).startsWith('route.');

  if (!isPage && !isApiRoute) {
    // Check for server action file
    if (content.includes("'use server'") || content.includes('"use server"')) {
      const routePath = '/' + path.dirname(relPath).replace(/\[([^\]]+)\]/g, ':$1');
      routes.push({
        type: 'SERVER_ACTION',
        filePath: 'src/app/' + relPath,
        routePath: routePath === '/.' ? '/' : routePath,
        methods: ['POST'],
        hasAuthCheck: /getUser|getAuthenticatedUser|auth\.uid|verifyDataAccess/i.test(content),
        roleGuard: extractRoleGuard(content),
      });
    }
    continue;
  }

  let routePath = '/' + path.dirname(relPath).replace(/\[([^\]]+)\]/g, ':$1');
  if (routePath === '/.') routePath = '/';

  if (isPage) {
    // Determine page auth / role requirements
    const hasAuthCheck = /getUser|getAuthenticatedUser|redirect\(['"]\/login['"]\)|createClient/i.test(content);
    const roleGuard = extractRoleGuard(content);
    routes.push({
      type: 'PAGE',
      filePath: 'src/app/' + relPath,
      routePath,
      methods: ['GET'],
      hasAuthCheck,
      roleGuard,
    });
  } else if (isApiRoute) {
    // Extract exported HTTP methods
    const methods = [];
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].forEach((m) => {
      const regex = new RegExp(`export\\s+async\\s+function\\s+${m}\\b`);
      if (regex.test(content)) methods.push(m);
    });

    const hasAuthCheck = /getUser|getAuthenticatedUser|auth\.uid|verifyDataAccess/i.test(content);
    const roleGuard = extractRoleGuard(content);

    routes.push({
      type: 'API',
      filePath: 'src/app/' + relPath,
      routePath,
      methods: methods.length > 0 ? methods : ['ALL'],
      hasAuthCheck,
      roleGuard,
    });
  }
}

function extractRoleGuard(content) {
  const guards = [];
  if (/verifyDataAccess/i.test(content)) {
    guards.push('verifyDataAccess(RBAC)');
  }
  if (/['"`]Administrator['"`]|['"`]admin['"`]/i.test(content) && /role/i.test(content)) {
    guards.push('Admin/Administrator');
  }
  if (/['"`]DOS['"`]/i.test(content) && /role/i.test(content)) {
    guards.push('DOS');
  }
  if (/['"`]Class Teacher['"`]|['"`]teacher['"`]/i.test(content) && /role/i.test(content)) {
    guards.push('Teacher');
  }
  if (/['"`]Theology Instructor['"`]/i.test(content) && /role/i.test(content)) {
    guards.push('Theology');
  }
  if (guards.length === 0) {
    if (/getUser|getAuthenticatedUser/i.test(content)) {
      return 'Authenticated (Any Role)';
    }
    return 'Public / Unguarded';
  }
  return guards.join(' | ');
}

// Sort routes
routes.sort((a, b) => a.routePath.localeCompare(b.routePath));

const summary = {
  timestamp: new Date().toISOString(),
  totalRoutes: routes.length,
  pagesCount: routes.filter((r) => r.type === 'PAGE').length,
  apiRoutesCount: routes.filter((r) => r.type === 'API').length,
  serverActionsCount: routes.filter((r) => r.type === 'SERVER_ACTION').length,
  unguardedCount: routes.filter((r) => r.roleGuard === 'Public / Unguarded').length,
  routes,
};

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const outJson = path.join(ARTIFACTS_DIR, 'route_enumeration_results.json');
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');

console.log('=== ROUTE ENUMERATION RESULTS ===');
console.log(`Total Routes: ${summary.totalRoutes}`);
console.log(`  - Pages: ${summary.pagesCount}`);
console.log(`  - API Routes: ${summary.apiRoutesCount}`);
console.log(`  - Server Actions: ${summary.serverActionsCount}`);
console.log(`  - Public / Unguarded: ${summary.unguardedCount}`);

console.log('\nSample Routes & Role Guards:');
routes.slice(0, 25).forEach((r) => {
  console.log(`  [${r.type}] ${r.methods.join(',')} ${r.routePath} -> Guard: ${r.roleGuard}`);
});

console.log(`\nDetailed enumeration saved to: ${outJson}`);
