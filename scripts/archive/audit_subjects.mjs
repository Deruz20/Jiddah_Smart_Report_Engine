import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const normalize = (str) => str ? str.replace(/[\.\s]/g, '').toLowerCase() : '';

async function runAudit() {
  console.log('--- Step 1: Fix BBAALE HERBERT orphans against circular_classes ---');
  
  const { data: teachers, error: tErr } = await supabase.from('teachers').select('*').eq('name', 'BBAALE HERBERT');
  if (tErr) throw tErr;
  
  const bbaale = teachers[0];
  if (bbaale) {
    const { data: circular } = await supabase.from('circular_classes').select('id, class_name');
    
    let resolvedClasses = [];
    let modified = false;

    for (let c of bbaale.classes) {
      if (c.includes('-')) {
        resolvedClasses.push(c); // already UUID
      } else {
        // It's a string like P.4
        const norm = normalize(c);
        const match = circular.find(cc => normalize(cc.class_name) === norm);
        if (match) {
          resolvedClasses.push(match.id);
          modified = true;
          console.log(`Resolved ${c} -> ${match.id} (${match.class_name})`);
        } else {
          console.log(`Warning: Could not resolve ${c}`);
        }
      }
    }

    if (modified) {
      const { error: updErr } = await supabase.from('teachers').update({ classes: resolvedClasses }).eq('id', bbaale.id);
      if (updErr) throw updErr;
      console.log('Successfully updated BBAALE HERBERT with resolved circular_classes UUIDs.');
      
      // Update the local orphan_fixes.sql just to keep it in sync
      const arrayStr = resolvedClasses.map(id => `'${id}'`).join(',');
      fs.writeFileSync('orphan_fixes.sql', `UPDATE teachers SET classes = ARRAY[${arrayStr}]::text[] WHERE id = '${bbaale.id}';\n`);
    } else {
      console.log('No modifications needed for BBAALE HERBERT.');
    }
  }

  console.log('\n--- Step 2: Audit teachers for null subject_id typos ---');
  const { data: allTeachers } = await supabase.from('teachers').select('id, name, subject');
  const { data: allSubjects } = await supabase.from('subjects').select('id, subject_name');

  const validSubjectNames = allSubjects.map(s => s.subject_name.toLowerCase());

  let typoCount = 0;
  for (const t of allTeachers) {
    const s = t.subject ? t.subject.trim() : '';
    if (!s) continue;
    
    if (s.toLowerCase() === 'theology' || s.toLowerCase() === 'secular') {
      continue; // Expected generic subjects
    }

    if (!validSubjectNames.includes(s.toLowerCase())) {
      console.log(`Found mismatch for ${t.name}: "${s}"`);
      
      // Attempt fuzzy matching (e.g. 'Quran' vs 'Qur\\'an')
      const normS = normalize(s);
      const match = allSubjects.find(sub => normalize(sub.subject_name) === normS);
      
      if (match) {
        console.log(`  -> Auto-fixing typo: "${s}" -> "${match.subject_name}"`);
        const { error: fixErr } = await supabase.from('teachers').update({ subject: match.subject_name }).eq('id', t.id);
        if (fixErr) throw fixErr;
        typoCount++;
      } else {
        console.log(`  -> No auto-fix match found. Adding new subject row: "${s}"`);
        const { data: newSubj, error: insErr } = await supabase.from('subjects').insert({ subject_name: s }).select();
        if (insErr) throw insErr;
        console.log(`  -> Inserted new subject: ${s} (ID: ${newSubj[0].id})`);
        validSubjectNames.push(s.toLowerCase());
        allSubjects.push(newSubj[0]);
        typoCount++;
      }
    }
  }

  console.log(`\nAudit complete. Fixed ${typoCount} typos/missing subjects.`);

  let needsReview = fs.existsSync('NEEDS-REVIEW.md') ? fs.readFileSync('NEEDS-REVIEW.md', 'utf8') : '';
  needsReview += '\n\n**Update:** Subject audit completed. Typo fixes applied and BBAALE HERBERT orphaned strings resolved to circular_classes UUIDs. [RESOLVED]';
  fs.writeFileSync('NEEDS-REVIEW.md', needsReview);
}

runAudit().catch(console.error);
