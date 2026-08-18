const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  let success = false;
  let attempts = 0;
  while (!success && attempts < 3) {
    try {
      attempts++;
      console.log('Attempt', attempts);
      
      const { data, error } = await supabase.from('subjects').select('*').in('subject_name', ['التاريخ والسيرة', 'الفقه']).eq('curriculum', 'theology');
      if (error) throw error;
      
      console.log('Found subjects to update:', data.length);
      for (const sub of data) {
        let newName = '';
        if (sub.subject_name === 'التاريخ والسيرة') newName = 'التربية الإسلامية';
        if (sub.subject_name === 'الفقه') newName = 'الفقه الإسلامي';
        
        console.log(`Updating ${sub.id} from '${sub.subject_name}' to '${newName}'`);
        const { error: updErr } = await supabase.from('subjects').update({ subject_name: newName }).eq('id', sub.id);
        if (updErr) throw updErr;
      }
      success = true;
      console.log('Successfully updated subjects.');
    } catch (err) {
      console.error('Error on attempt', attempts, ':', err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
})();
