import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  const { data, error } = await supabase
    .from('theology_marks')
    .select('id, enrollment_id, subject_id, term_id, mot_score, eot_score')
    .order('updated_at', { ascending: false })
    .limit(20)
  
  if (error) {
    console.error('Error fetching:', error)
    return
  }
  console.log(data)
}

main()
