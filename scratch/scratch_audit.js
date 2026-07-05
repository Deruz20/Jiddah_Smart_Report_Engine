const fs = require('fs');
const env = fs.readFileSync('c:\\Users\\JIDDAH\\Desktop\\jiddah-smart-report-engine\\apps\\backend\\.env.production', 'utf-8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
async function runAudit() {
  const { data: cData, error: cErr } = await supabase
    .from('circular_marks')
    .select('id, subject:circular_subjects!inner(section), enrollment:enrollments!inner(class:circular_classes!inner(section))');
    
  if (cErr) console.error(cErr);
  else if (cData) {
    const cMismatch = cData.filter(m => m.subject.section !== m.enrollment.class.section);
    console.log(`Found ${cMismatch.length} mismatched records in circular_marks.`);
  }

  const { data: tData, error: tErr } = await supabase
    .from('theology_marks')
    .select('id, subject:theology_subjects!inner(level), enrollment:enrollments!inner(class:theology_classes!inner(level))');
    
  if (tErr) console.error(tErr);
  else if (tData) {
    const tMismatch = tData.filter(m => m.subject.level !== m.enrollment.class.level);
    console.log(`Found ${tMismatch.length} mismatched records in theology_marks.`);
  }
}
runAudit();
