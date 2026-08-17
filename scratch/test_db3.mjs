import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vismrobdsdsaxmqegcay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc21yb2Jkc2RzYXhtcWVnY2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwMjUwNSwiZXhwIjoyMDkzMzc4NTA1fQ.8jSbEyXwqezVTPm1pxcQ6VnKNfcDWF9NQj526x8jShM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: enrollments } = await supabase.from('enrollments')
    .select('id, created_at, theology_class_id, circular_class_id, students(name)')
    .in('id', [
      '03cac5d3-2416-46e1-aa21-62e8ec249c78',
      'ba21d40b-f1ae-4548-bc79-321fd0c4e333',
      '4d7447e2-08f2-4aa1-bdbb-7165db0fb437'
    ])
  
  if (enrollments) {
    console.log('Enrollments for Group A (minority subject set):')
    enrollments.forEach(e => console.log(e))
  }
}

run().catch(console.error)
