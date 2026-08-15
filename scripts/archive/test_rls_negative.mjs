import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: bbaale, error: bErr } = await supabase
    .from('teachers')
    .select('*')
    .ilike('name', '%bbaale%')
    .single();
    
  if (bbaale) {
    const { data: assignments, error: aErr } = await supabase
      .from('teacher_class_assignments')
      .select('*, circular_classes(class_name)')
      .eq('teacher_id', bbaale.id);
    
    console.log(`Assignments for ${bbaale.name}:`, assignments);

    // If assignments is empty or null, fix it
    if (!assignments || assignments.length === 0) {
      console.log('Fixing BBAALE HERBERT classes...');
      const classesToMatch = ['P.4', 'P.5', 'P.6', 'P.7'];
      
      for (const cls of classesToMatch) {
        // match against circular_classes only
        const { data: circularClasses } = await supabase
          .from('circular_classes')
          .select('id, class_name');
          
        const matches = circularClasses.filter(c => c.class_name.replace(/\s+/g, '').toLowerCase() === cls.replace(/\s+/g, '').toLowerCase());
        
        if (matches.length > 0) {
          for (const match of matches) {
            console.log(`Inserting assignment for ${match.class_name}...`);
            await supabase.from('teacher_class_assignments').insert({
              teacher_id: bbaale.id,
              class_id: match.id,
              class_type: 'circular',
              subject_id: null
            });
          }
        }
      }
      console.log('Done fixing BBAALE HERBERT.');
    } else {
      console.log('BBAALE already has assignments. No fix needed.');
    }
  } else {
    console.log('BBAALE not found');
  }
}
run();
