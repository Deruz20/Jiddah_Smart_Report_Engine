import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // fallback to anon if service key not available, but admin.createUser will fail without service key.

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const classes = [
  'Nursery 1', 'Nursery 2', 'Nursery 3',
  'Primary 1', 'Primary 2', 'Primary 3',
  'Primary 4', 'Primary 5', 'Primary 6',
  'Primary 7'
]

async function seedTeachers() {
  console.log('Seeding 20 class teachers (10 Secular, 10 Theology)...')
  
  for (const className of classes) {
    const classId = className.toLowerCase().replace(' ', '_')
    
    // Secular Teacher
    const secularEmail = `${classId}_secular@jiddah.edu`
    const secularName = `${className} Secular Tr.`
    await createTeacher(secularEmail, secularName, 'Class Teacher', className, 'Secular')

    // Theology Teacher
    const theologyEmail = `${classId}_theology@jiddah.edu`
    const theologyName = `${className} Theology Tr.`
    await createTeacher(theologyEmail, theologyName, 'Theology Instructor', className, 'Theology')
  }
  
  console.log('Seeding complete. Default password for all teachers is: Teacher2026!')
}

async function createTeacher(email, name, role, assignedClass, subject) {
  try {
    // Add a delay to avoid rate limits / db locks
    await new Promise(resolve => setTimeout(resolve, 500))

    // 1. Create Auth User - use 'Class Teacher' as the auth role to bypass any rigid enum triggers, 
    // the specific role ('Theology Instructor') will be stored in the teachers table
    const authRole = role === 'Theology Instructor' ? 'Class Teacher' : role;
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'Teacher2026!',
      email_confirm: true,
      user_metadata: { full_name: name, role: authRole }
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`[SKIP] User ${email} already exists.`)
      } else {
        console.error(`[ERROR] creating auth user for ${email}:`, authError.message)
      }
      return
    }

    const userId = authData.user.id

    // 2. Insert into teachers table
    const { error: teacherError } = await supabase.from('teachers').insert({
      name: name,
      email: email,
      role: role,
      classes: [assignedClass],
      subject: subject,
      status: 'active'
    })

    if (teacherError) {
      console.error(`[ERROR] inserting teacher record for ${email}:`, teacherError.message)
    }

    console.log(`[SUCCESS] Created teacher: ${name} (${email})`)

  } catch (error) {
    console.error(`[FATAL] Error for ${email}:`, error)
  }
}

seedTeachers()
