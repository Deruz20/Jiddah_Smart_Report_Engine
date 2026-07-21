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
    const { error: authErr } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role } })
    if (authErr) console.log("Create user err:", authErr)
    const { error: tErr } = await supabaseAdmin.from('teachers').insert({
      email,
      name: `Test ${role}`,
      role,
      status: 'active',
      classes,
      subject
    })
    if (tErr) console.log("Insert teacher err:", tErr)
    console.log(`Created new ${role}: ${email}`)
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

async function runTest(name, url, method, cookieStr, expectedStatus, body = null, expectedEmptyArray = null) {
  console.log(`\n--- TEST: ${name} ---`)
  console.log(`${method} ${url}`)
  const options = { headers: { 'Cookie': cookieStr }, method }
  if (body) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  const res = await fetch(url, options)
  const resBody = await res.text()
  console.log(`Status: ${res.status} (Expected: ${expectedStatus})`)
  if (res.status !== expectedStatus) {
    console.error(`FAILED! Body: ${resBody}`)
  } else {
    if (expectedEmptyArray) {
       const json = JSON.parse(resBody);
       if (json[expectedEmptyArray] && json[expectedEmptyArray].length > 0) {
          console.error(`FAILED! Expected ${expectedEmptyArray} to be empty but got:`, json[expectedEmptyArray]);
          return;
       }
    }
    console.log('PASSED.')
  }
}

async function runAdversarialTest() {
  console.log("=== ADVERSARIAL TEST SETUP ===")

  const { data: theologyEnrollment } = await supabaseAdmin.from('enrollments')
    .select('id, student_id, circular_class_id, theology_class_id').not('theology_class_id', 'is', null).limit(1)
    
  const { data: secularEnrollment } = await supabaseAdmin.from('enrollments')
    .select('id, student_id, circular_class_id, theology_class_id').not('circular_class_id', 'is', null).limit(1)
    
  if (!theologyEnrollment?.length || !secularEnrollment?.length) {
    console.log("Need both theology and secular enrollments in DB to test.")
    return
  }
  
  const theoEnrId = theologyEnrollment[0].id
  const theoStudId = theologyEnrollment[0].student_id
  const secEnrId = secularEnrollment[0].id
  const secStudId = secularEnrollment[0].student_id
  const secClassId = secularEnrollment[0].circular_class_id
  
  // Get a real term_id
  const { data: terms } = await supabaseAdmin.from('terms').select('id').limit(1)
  const realTermId = terms?.[0]?.id || '123e4567-e89b-12d3-a456-426614174000'

  // 1. Setup Users
  await getOrCreateUser('sec_dos_3@jiddahschool.ug', 'DOS', [], 'Secular')
  await getOrCreateUser('support_staff@jiddahschool.ug', 'Support Staff')
  await getOrCreateUser('head_teacher@jiddahschool.ug', 'Head Teacher')
  // We need a Class Teacher assigned to the secular class, and one NOT assigned
  await getOrCreateUser('class_teacher_own@jiddahschool.ug', 'Class Teacher', [secClassId])
  await getOrCreateUser('class_teacher_other@jiddahschool.ug', 'Class Teacher', ['123e4567-e89b-12d3-a456-426614174000'])
  
  // 2. DOS Secular Tests
  const dosCookie = await loginAndGetCookie('sec_dos_3@jiddahschool.ug')
  await runTest('DOS Secular reading Secular Student Marks', `http://localhost:3000/api/marks?enrollment_id=${secEnrId}&term_id=${realTermId}`, 'GET', dosCookie, 200)
  await runTest('DOS Secular reading Theology Student Marks', `http://localhost:3000/api/theology-marks?enrollment_id=${theoEnrId}&term_id=${realTermId}`, 'GET', dosCookie, 403, null, 'theology_marks')
  
  // 3. Support Staff Tests
  const supportCookie = await loginAndGetCookie('support_staff@jiddahschool.ug')
  await runTest('Support Staff reading Secular marks', `http://localhost:3000/api/marks?enrollment_id=${secEnrId}&term_id=${realTermId}`, 'GET', supportCookie, 403)
  
  // 4. Head Teacher Tests
  const headCookie = await loginAndGetCookie('head_teacher@jiddahschool.ug')
  await runTest('Head Teacher reading Secular marks', `http://localhost:3000/api/marks?enrollment_id=${secEnrId}&term_id=${realTermId}`, 'GET', headCookie, 200)
  await runTest('Head Teacher reading Theology marks', `http://localhost:3000/api/theology-marks?enrollment_id=${theoEnrId}&term_id=${realTermId}`, 'GET', headCookie, 200)
  await runTest('Head Teacher writing Theology marks', `http://localhost:3000/api/theology-marks`, 'POST', headCookie, 403, { enrollment_id: theoEnrId, term_id: realTermId, score_type: 'bot', subject_id: '123e4567-e89b-12d3-a456-426614174000' })
  
  // 5. Class Teacher Tests
  const ctOwnCookie = await loginAndGetCookie('class_teacher_own@jiddahschool.ug')
  await runTest('Class Teacher reading OWN class marks', `http://localhost:3000/api/marks?enrollment_id=${secEnrId}&term_id=${realTermId}`, 'GET', ctOwnCookie, 200)
  
  const ctOtherCookie = await loginAndGetCookie('class_teacher_other@jiddahschool.ug')
  await runTest('Class Teacher reading OTHER class marks', `http://localhost:3000/api/marks?enrollment_id=${secEnrId}&term_id=${realTermId}`, 'GET', ctOtherCookie, 403)
}

runAdversarialTest().catch(console.error)
