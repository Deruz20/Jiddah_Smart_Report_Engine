const fs = require('fs');

function optimizeSave(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  const oldCircularLoop = `            for (const m of cToSave) {
              const existing = existingC?.find(e => e.subject_id === m.subject_id)
              if (existing) {
                const payload: any = {
                  bot_score: m.bot_score,
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                }
                if (updatedById) payload.updated_by = updatedById;
                
                const { error } = await supabase.from('circular_marks').update(payload).eq('id', existing.id)
                if (error) throw error;
              } else {
                const payload: any = {
                  enrollment_id: selectedEnrollmentId,
                  term_id: selectedTermId,
                  subject_id: m.subject_id,
                  bot_score: m.bot_score,
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                }
                if (updatedById) payload.updated_by = updatedById;
  
                const { error } = await supabase.from('circular_marks').insert(payload)
                if (error) throw error;
              }
            }`;

  const newCircularLoop = `            await Promise.all(cToSave.map(async (m) => {
              const existing = existingC?.find(e => e.subject_id === m.subject_id);
              if (existing) {
                const payload: any = {
                  bot_score: m.bot_score,
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                };
                if (updatedById) payload.updated_by = updatedById;
                const { error } = await supabase.from('circular_marks').update(payload).eq('id', existing.id);
                if (error) throw error;
              } else {
                const payload: any = {
                  enrollment_id: selectedEnrollmentId,
                  term_id: selectedTermId,
                  subject_id: m.subject_id,
                  bot_score: m.bot_score,
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                };
                if (updatedById) payload.updated_by = updatedById;
                const { error } = await supabase.from('circular_marks').insert(payload);
                if (error) throw error;
              }
            }));`;

  const oldTheologyLoop = `            for (const m of tToSave) {
              const existing = existingT?.find(e => e.subject_id === m.subject_id)
              if (existing) {
                const payload: any = {
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                }
                if (updatedById) payload.updated_by = updatedById;

                const { error } = await supabase.from('theology_marks').update(payload).eq('id', existing.id)
                if (error) throw error;
              } else {
                const payload: any = {
                  enrollment_id: selectedEnrollmentId,
                  term_id: selectedTermId,
                  subject_id: m.subject_id,
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                }
                if (updatedById) payload.updated_by = updatedById;

                const { error } = await supabase.from('theology_marks').insert(payload)
                if (error) throw error;
              }
            }`;

  const newTheologyLoop = `            await Promise.all(tToSave.map(async (m) => {
              const existing = existingT?.find(e => e.subject_id === m.subject_id);
              if (existing) {
                const payload: any = {
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                };
                if (updatedById) payload.updated_by = updatedById;
                const { error } = await supabase.from('theology_marks').update(payload).eq('id', existing.id);
                if (error) throw error;
              } else {
                const payload: any = {
                  enrollment_id: selectedEnrollmentId,
                  term_id: selectedTermId,
                  subject_id: m.subject_id,
                  mot_score: m.mot_score,
                  eot_score: m.eot_score
                };
                if (updatedById) payload.updated_by = updatedById;
                const { error } = await supabase.from('theology_marks').insert(payload);
                if (error) throw error;
              }
            }));`;

  content = content.replace(oldCircularLoop, newCircularLoop);
  content = content.replace(oldTheologyLoop, newTheologyLoop);
  fs.writeFileSync(filepath, content);
}

optimizeSave('src/components/AdminMarksEntryClient.tsx');
console.log('Optimized save performance');
