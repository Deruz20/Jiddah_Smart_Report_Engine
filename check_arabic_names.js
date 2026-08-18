const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { data, error } = await supabase.from('students').select('id, name, name_arabic, arabic_name');
    if (error) throw error;
    console.log(`Total students: ${data.length}`);
    const withNameArabic = data.filter(d => d.name_arabic && d.name_arabic.trim() !== '');
    const withArabicName = data.filter(d => d.arabic_name && d.arabic_name.trim() !== '');
    console.log(`Students with name_arabic: ${withNameArabic.length}`);
    console.log(`Students with arabic_name: ${withArabicName.length}`);
  } catch (e) {
    console.error(e);
  }
})();
