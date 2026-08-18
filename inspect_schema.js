const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'students' });
    if (error) {
      console.log('RPC error, trying a select:', error.message);
      const { data: selectData, error: selectError } = await supabase.from('students').select('*').limit(1);
      if (selectError) throw selectError;
      if (selectData && selectData.length > 0) {
        console.log('Columns from a sample row:', Object.keys(selectData[0]));
      } else {
         console.log('Table is empty, cannot infer columns.');
      }
    } else {
      console.log(data);
    }
  } catch (e) {
    console.error(e);
  }
})();
