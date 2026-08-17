import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vismrobdsdsaxmqegcay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc21yb2Jkc2RzYXhtcWVnY2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwMjUwNSwiZXhwIjoyMDkzMzc4NTA1fQ.8jSbEyXwqezVTPm1pxcQ6VnKNfcDWF9NQj526x8jShM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, subject_name, curriculum, section')
    .eq('curriculum', 'theology')
    .order('section')

  if (error) {
    console.error('Error fetching subjects:', error)
  } else {
    console.log('--- THEOLOGY SUBJECTS ---')
    console.table(data)
  }
}

run().catch(console.error)
