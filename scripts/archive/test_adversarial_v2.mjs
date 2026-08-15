import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const password = 'TestPassword123!'

async function getOrCreateUser(email, role, classes = [], subject = '') {
  const { data: teachers } = await supabaseAdmin.from('teachers').select('id').eq('email', email).limit(1)
  
  if (!teachers || teachers.length === 0) {
    await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role } })
    await supabaseAdmin.from('teachers').insert({
      email,
      name: `Test ${role}`,
      role,
      status: 'active',
      classes,
      subject
    })
  } else {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
    const user = usersData.users.find(u => u.email === email)
    if (user) await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
  }
}

async function loginAndGetCookie(email) {
  const authRes = await supabase.auth.signInWithPassword({ email, password })
  if (authRes.error) throw new Error(`Login failed for ${email}: ${authRes.error.message}`)
  const session = authRes.data.session
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token=${encodeURIComponent(JSON.stringify(session))}`
}

async function runTest(name, url, method, cookieStr) {
  console.log(`\n--- TEST: ${name} ---`)
  console.log(`${method} ${url}`)
  const options = { headers: { 'Cookie': cookieStr }, method }
  const res = await fetch(url, options)
  const resBody = await res.text()
  console.log(`Status: ${res.status}`)
  console.log(`Body: ${resBody}`)
}

async function main() {
  console.log("=== ADVERSARIAL TEST EXTENSION ===")

  // Find a student enrolled in BOTH departments to test the mark filtering
  const { data: dualEnrollment } = await supabaseAdmin.from('enrollments')
    .select('id, student_id, circular_class_id, theology_class_id')
    .not('theology_class_id', 'is', null)
    .not('circular_class_id', 'is', null)
    .limit(1)
    
  if (!dualEnrollment?.length) {
    console.log("No dual-enrolled student found.")
    return
  }
  
  const enrId = dualEnrollment[0].id
  const secClassId = dualEnrollment[0].circular_class_id
  const theoClassId = dualEnrollment[0].theology_class_id
  
  const { data: terms } = await supabaseAdmin.from('academic_terms').select('id').limit(1)
  const realTermId = terms?.[0]?.id || '123e4567-e89b-12d3-a456-426614174000'

  // 1. Setup Users
  await getOrCreateUser('theo_dos@jiddahschool.ug', 'DOS', [], 'Theology')
  await getOrCreateUser('theo_instructor_own@jiddahschool.ug', 'Theology Instructor', [theoClassId])
  await getOrCreateUser('theo_instructor_other@jiddahschool.ug', 'Theology Instructor', ['123e4567-e89b-12d3-a456-426614174000'])
  // Ensure the admin exists
  await getOrCreateUser('admin_test_adv@jiddahschool.ug', 'Administrator', [], '')

  // DOS Theology Test
  const dosTheoCookie = await loginAndGetCookie('theo_dos@jiddahschool.ug')
  await runTest('DOS Theology reading Marks (should have theology_marks, empty circular_marks)', 
    `http://localhost:3000/api/marks?enrollment_id=${enrId}&term_id=${realTermId}`, 'GET', dosTheoCookie)
  
  // Theology Instructor Tests
  const ctOwnCookie = await loginAndGetCookie('theo_instructor_own@jiddahschool.ug')
  await runTest('Theology Instructor reading OWN class marks', 
    `http://localhost:3000/api/marks?enrollment_id=${enrId}&term_id=${realTermId}`, 'GET', ctOwnCookie)
  
  const ctOtherCookie = await loginAndGetCookie('theo_instructor_other@jiddahschool.ug')
  await runTest('Theology Instructor reading OTHER class marks', 
    `http://localhost:3000/api/marks?enrollment_id=${enrId}&term_id=${realTermId}`, 'GET', ctOtherCookie)
    
  // Admin Test
  const adminCookie = await loginAndGetCookie('admin_test_adv@jiddahschool.ug')
  await runTest('Administrator reading Marks (should see full data)', 
    `http://localhost:3000/api/marks?enrollment_id=${enrId}&term_id=${realTermId}`, 'GET', adminCookie)
}

main().catch(console.error)
