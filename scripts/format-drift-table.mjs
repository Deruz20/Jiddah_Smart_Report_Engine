import fs from 'fs';

const driftData = JSON.parse(fs.readFileSync('scratch/drift_report_summary.json', 'utf8'));

let md = `# Comprehensive Production Schema & Naming Drift Report\n\n`;
md += `Generated from live production catalog JSON, repository migrations, codebase static AST analysis, and rehearsal database catalog.\n\n`;
md += `| Table Name | Code Query (.from) | Repo Migrations | Production Catalog (Live) | Rehearsal Stack | Prod RLS | Drift Category & Forensic Note |\n`;
md += `|---|---|---|---|---|---|---|\n`;

for (const row of driftData) {
  const inCode = row.in_code ? '✅ Yes' : '❌ No';
  const inRepo = row.in_repo_migrations ? '✅ Yes' : '❌ No';
  const inProd = row.in_production ? '✅ Yes' : '❌ No';
  const inReh = row.in_rehearsal ? '✅ Yes' : '❌ No';
  const rls = row.production_rls === true ? '🔒 ON' : row.production_rls === false ? '⚠️ OFF' : '—';
  
  md += `| \`${row.table}\` | ${inCode} | ${inRepo} | ${inProd} | ${inReh} | ${rls} | ${row.notes} |\n`;
}

fs.writeFileSync('scratch/drift_report_table.md', md, 'utf8');
console.log('Saved drift report table to scratch/drift_report_table.md');
