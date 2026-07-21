import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_URL
)

async function checkIbrahim() {
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) {
    console.error("Error fetching users:", error)
    return
  }
  
  const ibrahim = users.users.find(u => u.email === 'ibrahimwoira8@gmail.com')
  
  if (ibrahim) {
    console.log("=== RAW ROW FOR IBRAHIM ===")
    console.log(JSON.stringify(ibrahim, null, 2))
  } else {
    console.log("Ibrahim not found.")
  }
}

checkIbrahim().catch(console.error)
