import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const ARTIFACTS_DIR = path.resolve(ROOT_DIR, '../jiddah_agent_artifacts/sweeps');

// Known settings domains and their fields
const SETTINGS_REGISTRY = [
  // School Settings (Table: school_settings)
  { domain: 'school_settings', field: 'school_name', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'address', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'district', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'email', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'phone_1', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'phone_2', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'pay_code', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'current_term', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'current_year', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'motto', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'logo_url', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'primary_font', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'arabic_font', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'theme_color', table: 'school_settings', api: '/api/settings/school' },
  { domain: 'school_settings', field: 'report_theme_preset', table: 'school_settings', api: '/api/settings/school' },

  // Grading Standards (Table: grading_standards)
  { domain: 'grading_standards', field: 'grade_name', table: 'grading_standards', api: '/api/settings/grading-standards' },
  { domain: 'grading_standards', field: 'min_mark', table: 'grading_standards', api: '/api/settings/grading-standards' },
  { domain: 'grading_standards', field: 'max_mark', table: 'grading_standards', api: '/api/settings/grading-standards' },
  { domain: 'grading_standards', field: 'comment', table: 'grading_standards', api: '/api/settings/grading-standards' },
  { domain: 'grading_standards', field: 'aggregate_value', table: 'grading_standards', api: '/api/settings/grading-standards' },

  // Teacher Initials (Table: teacher_initials)
  { domain: 'teacher_initials', field: 'initials', table: 'teacher_initials', api: '/api/settings/initials' },
  { domain: 'teacher_initials', field: 'teacher_id', table: 'teacher_initials', api: '/api/settings/initials' },
  { domain: 'teacher_initials', field: 'class_id', table: 'teacher_initials', api: '/api/settings/initials' },

  // Academic Terms (Table: academic_terms)
  { domain: 'academic_terms', field: 'term_name', table: 'academic_terms', api: '/api/settings/terms' },
  { domain: 'academic_terms', field: 'is_active', table: 'academic_terms', api: '/api/settings/terms' },
  { domain: 'academic_terms', field: 'start_date', table: 'academic_terms', api: '/api/settings/terms' },
  { domain: 'academic_terms', field: 'end_date', table: 'academic_terms', api: '/api/settings/terms' },
];

function getAllSourceFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (/__tests__|\.test\.|node_modules|\.next/.test(fullPath)) continue;
    if (entry.isDirectory()) {
      results = results.concat(getAllSourceFiles(fullPath));
    } else if (/\.(tsx|ts|jsx|js|mjs)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = getAllSourceFiles(SRC_DIR);

const censusResults = SETTINGS_REGISTRY.map((setting) => {
  const readSites = [];
  const writeSites = [];
  const regex = new RegExp(`\\b${setting.field}\\b`, 'g');

  for (const file of allFiles) {
    const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    if (!regex.test(content)) continue;

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes(setting.field)) {
        const lineNo = idx + 1;
        const trimmed = line.trim();

        // Classify as write or read
        const isWrite = /insert|upsert|update|save|set|PATCH|POST|body\.|payload|onChange/i.test(trimmed);
        const isRead = /select|get|read|report|preview|style|font|color|render|format/i.test(trimmed) || !isWrite;

        if (isWrite) {
          writeSites.push({ file: relPath, line: lineNo, snippet: trimmed.slice(0, 100) });
        }
        if (isRead) {
          readSites.push({ file: relPath, line: lineNo, snippet: trimmed.slice(0, 100) });
        }
      }
    });
  }

  // Deduplicate files
  const uniqueReadFiles = [...new Set(readSites.map((s) => s.file))];
  const uniqueWriteFiles = [...new Set(writeSites.map((s) => s.file))];

  // Determine if read outside settings admin UI/API (i.e. used in reports, calculations, dashboard, print)
  const consumers = uniqueReadFiles.filter((f) => !f.includes('/settings/') && !f.includes('SettingsClient'));

  const isOrphan = consumers.length === 0;

  return {
    domain: setting.domain,
    field: setting.field,
    table: setting.table,
    api: setting.api,
    totalReferences: readSites.length + writeSites.length,
    writeFiles: uniqueWriteFiles,
    readFiles: uniqueReadFiles,
    consumers,
    isOrphan,
    status: isOrphan ? 'ORPHAN (Saved/configured but never read by report or core views)' : 'WIRED',
  };
});

const summary = {
  timestamp: new Date().toISOString(),
  totalSettingsTracked: censusResults.length,
  wiredCount: censusResults.filter((r) => !r.isOrphan).length,
  orphanCount: censusResults.filter((r) => r.isOrphan).length,
  orphans: censusResults.filter((r) => r.isOrphan).map((r) => ({
    domain: r.domain,
    field: r.field,
    status: r.status,
  })),
  census: censusResults,
};

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const outJson = path.join(ARTIFACTS_DIR, 'settings_census_results.json');
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');

console.log('=== SETTINGS CENSUS RESULTS ===');
console.log(`Total settings tracked: ${summary.totalSettingsTracked}`);
console.log(`Wired settings: ${summary.wiredCount}`);
console.log(`Orphan settings: ${summary.orphanCount}`);

if (summary.orphanCount > 0) {
  console.log('\nPotential Orphan Settings:');
  summary.orphans.forEach((o) => {
    console.log(`  - [${o.domain}] ${o.field}: ${o.status}`);
  });
}
console.log(`\nDetailed census saved to: ${outJson}`);
