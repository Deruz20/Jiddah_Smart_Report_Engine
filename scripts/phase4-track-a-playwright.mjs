import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const WORKSPACE_DIR = process.cwd()
const ARTIFACT_SCREENSHOT_DIR =
  'C:\\Users\\USER\\.gemini\\antigravity\\brain\\5e092b19-cfeb-417e-a4d3-91395a9ea9d1\\screenshots'
const REPO_SCREENSHOT_DIR = path.join(WORKSPACE_DIR, 'artifacts', 'phase4-screenshots')

fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(REPO_SCREENSHOT_DIR, { recursive: true })

const MOCK_SUPABASE_PORT = 54399
const NEXT_PORT = 3199
const BASE_URL = `http://127.0.0.1:${NEXT_PORT}`
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

let mockGuestMode = false

const MOCK_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@jiddah.ac.ug',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {
    role: 'Administrator',
    full_name: 'Ustadh Ibrahim Al-Mansoor',
    name: 'Ustadh Ibrahim Al-Mansoor',
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const MOCK_CLASSES = [
  { id: 'c-p4-id', class_name: 'Primary 4', section: 'lower_primary', stream: 'East', class_teacher_id: MOCK_USER.id },
  { id: 'c-p5-id', class_name: 'Primary 5', section: 'upper_primary', stream: 'North', class_teacher_id: null },
  { id: 'c-p6-id', class_name: 'Primary 6', section: 'upper_primary', stream: 'Main', class_teacher_id: null },
]

const MOCK_THEO_CLASSES = [
  { id: 't-p4-id', class_name: 'Theology P.4', level: 'primary', stream: 'A' },
  { id: 't-p5-id', class_name: 'Theology P.5', level: 'primary', stream: 'A' },
]

const MOCK_SUBJECTS = [
  { id: 'sub-math', subject_name: 'Mathematics', section: 'lower_primary', is_core: true },
  { id: 'sub-eng', subject_name: 'English', section: 'lower_primary', is_core: true },
  { id: 'sub-lit1', subject_name: 'Literacy I', section: 'lower_primary', is_core: true },
  { id: 'sub-lit2', subject_name: 'Literacy II', section: 'lower_primary', is_core: true },
]

const MOCK_THEO_SUBJECTS = [
  { id: 'tsub-1', subject_name_arabic: 'القرآن الكريم', level: 'primary', sort_order: 1 },
  { id: 'tsub-2', subject_name_arabic: 'الفقه الإسلامي', level: 'primary', sort_order: 2 },
  { id: 'tsub-3', subject_name_arabic: 'التوحيد والسيرة', level: 'primary', sort_order: 3 },
  { id: 'tsub-4', subject_name_arabic: 'اللغة العربية', level: 'primary', sort_order: 4 },
]

const MOCK_STUDENTS = [
  { id: 'stu-1', student_no: 'JID-2026-001', full_name: 'Amina Nakato', full_name_arabic: 'أمينة نكاتو', gender: 'Female', status: 'active' },
  { id: 'stu-2', student_no: 'JID-2026-002', full_name: 'Sulaiman Kato', full_name_arabic: 'سليمان كاتو', gender: 'Male', status: 'active' },
  { id: 'stu-3', student_no: 'JID-2026-003', full_name: 'Fatuma Nabirye', full_name_arabic: 'فاطمة نبيري', gender: 'Female', status: 'active' },
  { id: 'stu-4', student_no: 'JID-2026-004', full_name: 'Hamza Ssemakula', full_name_arabic: 'حمزة سيماكولا', gender: 'Male', status: 'active' },
]

const MOCK_ENROLLMENTS = MOCK_STUDENTS.map((s, idx) => ({
  id: `enr-${idx + 1}`,
  student_id: s.id,
  academic_year: '2026',
  circular_class_id: 'c-p4-id',
  theology_class_id: 't-p4-id',
  students: s,
  circular_classes: MOCK_CLASSES[0],
  theology_classes: MOCK_THEO_CLASSES[0],
}))

const MOCK_CIRCULAR_MARKS = [
  { id: 'cm-1', enrollment_id: 'enr-1', term_id: 'term-2026-1', subject_id: 'sub-math', bot_score: 88, mot_score: 90, eot_score: 92 },
  { id: 'cm-2', enrollment_id: 'enr-1', term_id: 'term-2026-1', subject_id: 'sub-eng', bot_score: 84, mot_score: 85, eot_score: 87 },
  { id: 'cm-3', enrollment_id: 'enr-2', term_id: 'term-2026-1', subject_id: 'sub-math', bot_score: 76, mot_score: 85, eot_score: 82 },
  { id: 'cm-4', enrollment_id: 'enr-3', term_id: 'term-2026-1', subject_id: 'sub-math', bot_score: 68, mot_score: null, eot_score: null },
]

const MOCK_THEOLOGY_MARKS = [
  { id: 'tm-1', enrollment_id: 'enr-1', term_id: 'term-2026-1', subject_id: 'tsub-1', mot_score: 94, eot_score: 96 },
  { id: 'tm-2', enrollment_id: 'enr-2', term_id: 'term-2026-1', subject_id: 'tsub-1', mot_score: 88, eot_score: 89 },
]

const MOCK_SETTINGS = {
  id: 1,
  name: 'Jiddah Islamic Junior School',
  address: 'P.O.Box 34008 Kampala (U)',
  district: 'Kampala',
  email: 'registrar@jiddah.ac.ug',
  phone: '+256 702 551 900',
  current_term: 'Mid Term',
  current_year: 2026,
  motto: 'Knowledge, Faith & Excellence',
  logo_url: '/school_badge.png',
  primary_font: 'Plus Jakarta Sans',
  arabic_font: 'Amiri',
  theme_color: '#1A5246',
  report_theme_preset: 'emerald-gold',
}

const MOCK_NOTIFICATIONS = [
  {
    id: 101,
    title: 'Primary 4 Mid-Term Marks Submitted',
    message: 'Ustadh Ibrahim saved 36 secular subject scores for Primary 4 East.',
    recipient_id: null,
    is_read: false,
    priority: 'normal',
    type: 'report',
    created_at: '2026-10-21T08:30:00Z',
  },
  {
    id: 102,
    title: 'Term 2 Report Generation Window Open',
    message: 'Class Teachers can now review MOT rankings and remarks in the Report Center.',
    recipient_id: null,
    is_read: false,
    priority: 'high',
    type: 'deadline',
    created_at: '2026-10-21T07:15:00Z',
  },
]

const MOCK_ACTIVITY_LOGS = [
  {
    id: 'act-1',
    user_id: MOCK_USER.id,
    action: 'save_marks',
    metadata: { class_name: 'Primary 4', count: 16 },
    created_at: '2026-10-21T08:30:00Z',
    teachers: { name: 'Ustadh Ibrahim Al-Mansoor', role: 'Administrator' },
  },
]

function resolveTableResponse(pathname, searchParams, acceptHeader = '') {
  const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json')
  const wrap = (rows) => (isSingle ? (rows[0] ?? null) : rows)

  if (pathname.endsWith('/teachers')) {
    return wrap([
      {
        id: MOCK_USER.id,
        auth_user_id: MOCK_USER.id,
        name: 'Ustadh Ibrahim Al-Mansoor',
        email: MOCK_USER.email,
        role: 'Administrator',
        subject: 'Administration',
        status: 'active',
        phone: '+256 702 551 900',
      },
    ])
  }
  if (pathname.endsWith('/teacher_class_assignments')) {
    return wrap([{ id: 'tca-1', teacher_id: MOCK_USER.id, class_id: 'c-p4-id', class_type: 'circular' }])
  }
  if (pathname.endsWith('/terms')) {
    return wrap([{ id: 'term-2026-1', academic_year: '2026', term_name: 'Mid Term', is_active: true }])
  }
  if (pathname.endsWith('/circular_classes')) {
    return wrap(MOCK_CLASSES)
  }
  if (pathname.endsWith('/theology_classes')) {
    return wrap(MOCK_THEO_CLASSES)
  }
  if (pathname.endsWith('/circular_subjects')) {
    return wrap(MOCK_SUBJECTS)
  }
  if (pathname.endsWith('/theology_subjects')) {
    return wrap(MOCK_THEO_SUBJECTS)
  }
  if (pathname.endsWith('/students')) {
    return wrap(MOCK_STUDENTS)
  }
  if (pathname.endsWith('/enrollments')) {
    return wrap(MOCK_ENROLLMENTS)
  }
  if (pathname.endsWith('/circular_marks')) {
    return wrap(MOCK_CIRCULAR_MARKS)
  }
  if (pathname.endsWith('/theology_marks')) {
    return wrap(MOCK_THEOLOGY_MARKS)
  }
  if (pathname.endsWith('/school_settings')) {
    return wrap([MOCK_SETTINGS])
  }
  if (pathname.endsWith('/grading_criteria')) {
    return wrap([])
  }
  if (pathname.endsWith('/notifications')) {
    return wrap(MOCK_NOTIFICATIONS)
  }
  if (pathname.endsWith('/activity_logs')) {
    const actionEq = searchParams.get('action')
    if (actionEq && actionEq.includes('update_school_customization_v1')) {
      return wrap([])
    }
    return wrap(MOCK_ACTIVITY_LOGS)
  }
  return wrap([])
}

function startMockSupabaseServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${MOCK_SUPABASE_PORT}`)
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', '*')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      if (url.pathname.startsWith('/auth/v1/user')) {
        if (mockGuestMode) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ message: 'Auth session missing!' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(MOCK_USER))
        return
      }

      if (url.pathname.startsWith('/auth/v1/token') || url.pathname.startsWith('/auth/v1/session')) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            access_token: 'mock-access-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-token',
            user: MOCK_USER,
          })
        )
        return
      }

      if (url.pathname.startsWith('/rest/v1/')) {
        const accept = String(req.headers['accept'] || '')
        const prefer = String(req.headers['prefer'] || '')
        const data = resolveTableResponse(url.pathname, url.searchParams, accept)
        if (prefer.includes('count=exact')) {
          const count = Array.isArray(data) ? data.length : data ? 1 : 0
          res.setHeader('Content-Range', `0-${Math.max(0, count - 1)}/${count}`)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })

    server.listen(MOCK_SUPABASE_PORT, '127.0.0.1', () => {
      console.log(`[MockSupabase] Listening on http://127.0.0.1:${MOCK_SUPABASE_PORT}`)
      resolve(server)
    })
  })
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 90000)
      const res = await fetch(url, { signal: controller.signal, redirect: 'manual' })
      clearTimeout(timer)
      console.log(`[waitForServer] Response from ${url}: status=${res.status}`)
      if (res.status < 500) return true
    } catch (err) {
      console.log(`[waitForServer] Poll error: ${err instanceof Error ? err.message : String(err)}`)
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800, isMobile: true },
  { name: '390x844', width: 390, height: 844, isMobile: true },
  { name: '768x1024', width: 768, height: 1024, isMobile: false },
  { name: '1366x768', width: 1366, height: 768, isMobile: false },
]

const PAGES = [
  { slug: 'login', label: 'Login', path: '/login', guest: true },
  { slug: 'dashboard', label: 'Dashboard', path: '/admin', guest: false },
  { slug: 'marks-entry', label: 'Marks Entry', path: '/admin/marks', guest: false },
  { slug: 'report-center', label: 'Report Center', path: '/admin/reports', guest: false },
  { slug: 'settings', label: 'Settings', path: '/admin/settings', guest: false },
  { slug: 'notifications', label: 'Notifications', path: '/admin/notifications', guest: false },
]

async function run() {
  // Remove only stale dev lock file, keeping compiled .next cache warm
  const lockPath = path.join(WORKSPACE_DIR, '.next', 'dev', 'lock')
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath)
    } catch {
      // ignore
    }
  }

  const mockSupabaseServer = await startMockSupabaseServer()

  const mockAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2siLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.mocksignature'
  const mockServiceKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2siLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.mocksignature'

  const nextBin = path.join(WORKSPACE_DIR, 'node_modules', 'next', 'dist', 'bin', 'next')
  let isNextReady = false

  const nextProc = spawn(
    process.execPath,
    [nextBin, 'dev', '-H', '127.0.0.1', '-p', String(NEXT_PORT)],
    {
      cwd: WORKSPACE_DIR,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_SUPABASE_PORT}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: mockAnonKey,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: mockAnonKey,
        SUPABASE_SERVICE_ROLE_KEY: mockServiceKey,
        NEXT_PUBLIC_POWERSYNC_URL: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  nextProc.stdout.on('data', (chunk) => {
    const text = chunk.toString()
    if (text.includes('Ready')) {
      isNextReady = true
    }
    process.stdout.write(`[NextDev] ${text}`)
  })
  nextProc.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    process.stderr.write(`[NextDev Err] ${text}`)
  })

  const results = []
  let browser = null

  try {
    console.log(`[TrackA] Waiting for Next.js Ready signal ...`)
    const readyStart = Date.now()
    while (!isNextReady && Date.now() - readyStart < 45000) {
      await new Promise((r) => setTimeout(r, 500))
    }

    console.log(`[TrackA] Warming up ${BASE_URL}/login ...`)
    mockGuestMode = true
    await waitForServer(`${BASE_URL}/login`, 120000)
    console.log(`[TrackA] Launching Playwright with local Chrome (${CHROME_PATH})...`)

    browser = await chromium.launch({
      headless: true,
      executablePath: CHROME_PATH,
    })

    for (const pageSpec of PAGES) {
      mockGuestMode = pageSpec.guest
      // Pre-warm route compilation before opening viewports
      await waitForServer(`${BASE_URL}${pageSpec.path}`, 120000)

      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
        })

        if (!pageSpec.guest) {
          const sessionPayload = JSON.stringify({
            access_token: 'mock-access-token',
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: 'mock-refresh-token',
            user: MOCK_USER,
          })
          await context.addCookies([
            {
              name: 'sb-127-auth-token',
              value: `base64-${Buffer.from(sessionPayload).toString('base64')}`,
              domain: '127.0.0.1',
              path: '/',
            },
          ])
        }

        const page = await context.newPage()

        // Intercept browser-side API requests for deterministic rendering
        await page.route('**/api/settings/school**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ settings: MOCK_SETTINGS }),
          })
        })

        await page.route('**/api/marks**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              circular_marks: MOCK_SUBJECTS.map((s, i) => ({
                subject_id: s.id,
                subject_name: s.subject_name,
                is_core: true,
                bot_score: 80 + i * 2,
                mot_score: 84 + i * 2,
                eot_score: 86 + i * 2,
              })),
              theology_marks: MOCK_THEO_SUBJECTS.map((s, i) => ({
                subject_id: s.id,
                subject_name_arabic: s.subject_name_arabic,
                mot_score: 88 + i,
                eot_score: 90 + i,
              })),
            }),
          })
        })

        await page.route('**/api/classes**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              circular_classes: MOCK_CLASSES,
              theology_classes: MOCK_THEO_CLASSES,
            }),
          })
        })

        await page.route('**/api/terms**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              terms: [{ id: 'term-2026-1', academic_year: '2026', term_name: 'Mid Term', is_active: true }],
            }),
          })
        })

        const targetUrl = `${BASE_URL}${pageSpec.path}`
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 })
        await page.waitForTimeout(1000)

        // Check horizontal overflow
        const overflowMetrics = await page.evaluate(() => {
          const docEl = document.documentElement
          const body = document.body
          const mainEl = document.querySelector('main')
          const docScrollWidth = docEl.scrollWidth
          const docClientWidth = docEl.clientWidth
          const bodyScrollWidth = body ? body.scrollWidth : 0
          const bodyClientWidth = body ? body.clientWidth : 0
          const mainScrollWidth = mainEl ? mainEl.scrollWidth : 0
          const mainClientWidth = mainEl ? mainEl.clientWidth : 0
          const headings = Array.from(document.querySelectorAll('h1, h2')).map((h) => h.textContent?.trim()).slice(0, 3)

          return {
            docScrollWidth,
            docClientWidth,
            bodyScrollWidth,
            bodyClientWidth,
            mainScrollWidth,
            mainClientWidth,
            hasDocOverflow: docScrollWidth > docClientWidth + 1,
            hasBodyOverflow: bodyScrollWidth > Math.max(bodyClientWidth, docClientWidth) + 1,
            hasMainOverflow: mainEl ? mainScrollWidth > mainClientWidth + 1 : false,
            headings,
          }
        })

        const filename = `${pageSpec.slug}-${vp.name}.png`
        const artifactPath = path.join(ARTIFACT_SCREENSHOT_DIR, filename)
        const repoPath = path.join(REPO_SCREENSHOT_DIR, filename)

        await page.screenshot({ path: artifactPath, fullPage: true })
        fs.copyFileSync(artifactPath, repoPath)

        const zeroOverflowPass =
          !overflowMetrics.hasDocOverflow &&
          !overflowMetrics.hasBodyOverflow &&
          !overflowMetrics.hasMainOverflow

        const record = {
          page: pageSpec.label,
          slug: pageSpec.slug,
          route: pageSpec.path,
          viewport: vp.name,
          isMobile: vp.isMobile,
          screenshot: filename,
          artifactPath,
          repoPath,
          overflowMetrics,
          status: vp.isMobile ? (zeroOverflowPass ? 'PASS' : 'FAIL') : 'PASS',
        }

        results.push(record)
        console.log(
          `[TrackA] ${record.status} | ${pageSpec.label.padEnd(15)} | ${vp.name.padEnd(9)} | doc:${overflowMetrics.docScrollWidth}/${overflowMetrics.docClientWidth} | headings:${JSON.stringify(overflowMetrics.headings)} | ${filename}`
        )

        await context.close()
      }
    }
  } finally {
    if (browser) await browser.close()
    nextProc.kill('SIGTERM')
    mockSupabaseServer.close()
  }

  const summaryPath = path.join(REPO_SCREENSHOT_DIR, 'track-a-results.json')
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2))
  console.log(`[TrackA] Saved summary to ${summaryPath}`)

  const failedMobile = results.filter((r) => r.isMobile && r.status !== 'PASS')
  if (failedMobile.length > 0) {
    console.error(`[TrackA] Mobile overflow failures detected:`, failedMobile)
    process.exitCode = 1
  }
}

run().catch((err) => {
  console.error('[TrackA] Fatal error:', err)
  process.exit(1)
})
