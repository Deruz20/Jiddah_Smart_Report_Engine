import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const normalize = (str) => {
  if (!str) return '';
  return str.replace(/[\.\s]/g, '').toLowerCase();
};

async function fixOrphans() {
  const { data: teachers, error: tErr } = await supabase.from('teachers').select('id, name, subject, classes').not('classes', 'is', null);
  if (tErr) throw tErr;

  const { data: circularClasses, error: cErr } = await supabase.from('circular_classes').select('id, class_name');
  if (cErr) throw cErr;

  const { data: theologyClasses, error: thErr } = await supabase.from('theology_classes').select('id, class_name_english, class_name_arabic');
  if (thErr) throw thErr;

  const circularIds = new Set(circularClasses.map(c => c.id));
  const theologyIds = new Set(theologyClasses.map(c => c.id));

  const needsReview = [];
  const sqlUpdates = [];

  for (const t of teachers) {
    if (!Array.isArray(t.classes)) continue;
    
    let hasChanges = false;
    const newClasses = [];

    for (const classId of t.classes) {
      if (circularIds.has(classId) || theologyIds.has(classId)) {
        newClasses.push(classId);
        continue;
      }

      // It's an orphan/string. Let's normalize and match.
      const norm = normalize(classId);
      
      const matches = [];
      
      // Check circular
      for (const cc of circularClasses) {
        if (normalize(cc.class_name) === norm) {
          matches.push(cc.id);
        }
      }
      
      // Check theology
      for (const tc of theologyClasses) {
        if (normalize(tc.class_name_english) === norm || normalize(tc.class_name_arabic) === norm) {
          matches.push(tc.id);
        }
      }

      const uniqueMatches = [...new Set(matches)];

      if (uniqueMatches.length === 1) {
        newClasses.push(uniqueMatches[0]);
        hasChanges = true;
      } else {
        needsReview.push({
          teacher: t.name,
          orphan_string: classId,
          normalized: norm,
          matches_found: uniqueMatches.length
        });
        hasChanges = true;
      }
    }

    if (hasChanges) {
      const arrayStr = newClasses.map(id => `'${id}'`).join(',');
      sqlUpdates.push(`UPDATE teachers SET classes = ARRAY[${arrayStr}]::text[] WHERE id = '${t.id}';`);
    }
  }

  if (needsReview.length > 0) {
    let md = '# Needs Review: Orphaned Classes\n\n';
    md += 'The following class names in the `teachers.classes` array could not be confidently mapped to a single UUID.\n\n';
    for (const item of needsReview) {
      md += `- Teacher: ${item.teacher}\n  Orphan String: ${item.orphan_string}\n  Matches Found: ${item.matches_found}\n\n`;
    }
    fs.writeFileSync('NEEDS-REVIEW.md', md);
    console.log('Created NEEDS-REVIEW.md with', needsReview.length, 'unresolved items.');
  }

  if (sqlUpdates.length > 0) {
    fs.writeFileSync('orphan_fixes.sql', sqlUpdates.join('\n') + '\n');
    console.log('Created orphan_fixes.sql with', sqlUpdates.length, 'update statements.');
  } else {
    console.log('No SQL updates generated.');
  }
}

fixOrphans().catch(console.error);
