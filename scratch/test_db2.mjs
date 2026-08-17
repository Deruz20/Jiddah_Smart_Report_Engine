import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vismrobdsdsaxmqegcay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc21yb2Jkc2RzYXhtcWVnY2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwMjUwNSwiZXhwIjoyMDkzMzc4NTA1fQ.8jSbEyXwqezVTPm1pxcQ6VnKNfcDWF9NQj526x8jShM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: sub } = await supabase.from('subjects').select('*').eq('curriculum', 'theology')
  
  if (sub) {
    console.log('All Theology Subjects:');
    sub.sort((a,b) => a.subject_name.localeCompare(b.subject_name)).forEach(s => {
      console.log(`- ${s.id}: ${s.subject_name} (section: ${s.section})`)
    })
  }

  // Also check step 0.3 failing PATCH requests constraint
  // We can't see the response body of a client's 400 error, but we can try to do a PATCH on that enrollment_id to see what error we get.
  // "id 736687cc..., b3703e0d... all belong to one enrollment (85b14e99-dec7-4209-ae12-e1b5752413f8)"
  // Let's try to update one and catch the error
  const { error } = await supabase.from('theology_marks').update({ mot_score: 90 }).eq('enrollment_id', '85b14e99-dec7-4209-ae12-e1b5752413f8')
  console.log('Update Error for enrollment 85b14e99...:', error)
}

run().catch(console.error)
