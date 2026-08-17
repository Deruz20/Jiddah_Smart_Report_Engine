import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vismrobdsdsaxmqegcay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc21yb2Jkc2RzYXhtcWVnY2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwMjUwNSwiZXhwIjoyMDkzMzc4NTA1fQ.8jSbEyXwqezVTPm1pxcQ6VnKNfcDWF9NQj526x8jShM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: tm } = await supabase.from('theology_marks').select('id, subject_id, subjects(id)')
  const tmOrphans = tm ? tm.filter(m => !m.subjects) : []
  console.log('Orphan theology_marks count:', tmOrphans.length)

  const { data: cm } = await supabase.from('circular_marks').select('id, subject_id, subjects(id)')
  const cmOrphans = cm ? cm.filter(m => !m.subjects) : []
  console.log('Orphan circular_marks count:', cmOrphans.length)

  const { data: sub } = await supabase.from('subjects').select('*').in('id', [
    'ccd835fd-674a-4e36-bfce-62bc7b4e4e7a','ff29ec10-bc1b-42db-b7d4-c448d8222121',
    '1d0d7755-0931-4a86-a452-2c95cb602dd2','8a132aad-0573-4714-89f5-87c3972d097c',
    '657a93d9-c473-4054-9d65-bd9b9593836d','00064890-b816-4e28-82a3-143c82510c3b',
    '9778664e-3672-438f-8d41-88d8ee4eb98e','5b136890-988b-4f38-928a-c499073ef69f'
  ])
  
  if (sub) {
    console.log('Subjects for Step 0D:');
    sub.sort((a,b) => a.subject_name.localeCompare(b.subject_name)).forEach(s => {
      console.log(`- ${s.id}: ${s.subject_name} (${s.curriculum} - ${s.section})`)
    })
  }
}

run().catch(console.error)
