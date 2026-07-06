const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://vismrobdsdsaxmqegcay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc21yb2Jkc2RzYXhtcWVnY2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDI1MDUsImV4cCI6MjA5MzM3ODUwNX0.ee25OGb1m9_n7j-fePXflc6FetNPKFp1iBZqADXIevo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        circular_class_id,
        circular_classes ( id, class_name, section ),
        students ( id, name, admission_number )
      `);
  console.log('Error:', error);
  const byClass = {};
  for (const e of (data || [])) {
     const name = e.circular_classes ? e.circular_classes.class_name : ('Unknown-' + e.circular_class_id);
     byClass[name] = (byClass[name] || 0) + 1;
  }
  console.log('Counts by class_name:', byClass);
}

check();
