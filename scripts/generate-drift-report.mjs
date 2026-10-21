import fs from 'fs';

const catalog = JSON.parse(fs.readFileSync('scratch/production_catalog.json', 'utf8'));
const prodTables = new Set(catalog.tables.map(t => t.table));
const prodTableMeta = Object.fromEntries(catalog.tables.map(t => [t.table, t]));

// Scan codebase queries
const codeUsage = JSON.parse(fs.readFileSync('scratch/table_drift_analysis.json', 'utf8'));

// Rehearsal tables
const rehearsalTables = new Set([
  'academic_terms', 'activity_logs', 'circular_classes', 'circular_marks',
  'circular_subjects', 'enrollments', 'grading_criteria', 'notification_reads',
  'notifications', 'school_settings', 'students', 'subjects', 'teacher_initials',
  'teacher_invites', 'teachers', 'terms', 'theology_classes', 'theology_marks',
  'theology_subjects'
]);

const report = [];

for (const item of codeUsage) {
  const t = item.table;
  const inProd = prodTables.has(t);
  const inRepo = item.in_repo_migrations;
  const inCode = item.in_codebase;
  const inRehearsal = rehearsalTables.has(t);
  const prodRLS = inProd ? prodTableMeta[t]?.rls : 'N/A';
  
  let driftNote = 'Aligned';
  if (t === 'circular_marks' && inProd) {
    driftNote = 'Production has BOTH circular_marks (RLS on) and legacy circular_results (RLS off). Code uses circular_marks.';
  } else if (t === 'theology_marks' && inProd) {
    driftNote = 'Production has BOTH theology_marks (RLS on) and legacy theology_results (RLS off). Code uses theology_marks.';
  } else if (t === 'circular_subjects' || t === 'theology_subjects') {
    driftNote = 'In production, these are real physical tables with RLS=false. In rehearsal, they were created as views on subjects.';
  } else if (t === 'terms' || t === 'academic_terms') {
    driftNote = 'Production has BOTH terms (RLS off) and academic_terms (RLS on). Code queries both.';
  } else if (t === 'activity_log' || t === 'activity_logs') {
    driftNote = 'Production has BOTH activity_log (int id) and activity_logs (uuid id). Code primarily uses activity_logs with fallback to activity_log.';
  } else if (!inProd && inCode) {
    driftNote = 'In code but NOT in production catalog (e.g. storage bucket or local table).';
  } else if (inProd && !inCode) {
    driftNote = 'In production but UNUSED by current code (legacy table).';
  }

  report.push({
    table: t,
    in_code: inCode,
    in_repo_migrations: inRepo,
    in_production: inProd,
    in_rehearsal: inRehearsal,
    production_rls: prodRLS,
    notes: driftNote
  });
}

fs.writeFileSync('scratch/drift_report_summary.json', JSON.stringify(report, null, 2));
console.log('Generated drift report with', report.length, 'tables');
