import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import {
  generateStudentReportHtml,
  getJobById,
  saveJob,
  getZipArchive,
  storeZipArchive,
  processBatchExportJob,
} from '@/lib/pdf-export-worker'

test('Epic 2: generateStudentReportHtml generates print-compliant HTML with exact styles', () => {
  const html = generateStudentReportHtml({
    student: {
      id: 'student-123',
      name: 'Amina Nakato',
      arabic_name: 'أمينة ناكاتو',
      admission_number: 'JID/2026/088',
      class_name: 'Primary Four',
      section: 'Blue',
    },
    subjects: [
      {
        subject_name: 'English',
        bot_score: 80,
        mot_score: 84,
        eot_score: 86,
        score: 84,
        grade_display: 'D1',
        remark: 'Excellent work',
        teacher_initials: 'NK',
      },
      {
        subject_name: 'Mathematics',
        bot_score: 75,
        mot_score: 82,
        eot_score: 85,
        score: 82,
        grade_display: 'D1',
        remark: 'Great problem solver',
        teacher_initials: 'JM',
      },
    ],
    theologySubjects: [
      {
        subject_name_arabic: 'القرآن الكريم',
        mot_score: 90,
        eot_score: 94,
        score: 90,
        grade_display: 'D1',
        theology_remark: 'ممتاز',
      },
    ],
    aggregates: {
      total: 5,
      division: '1',
      status: 'Passed with Distinction',
    },
    schoolSettings: {
      school_name: 'Jiddah Islamic Nursery & Primary School',
      motto: 'Knowledge is Light',
    },
    stampDate: '20/11/2026',
    scoreType: 'mot',
  })

  // 1. Verify exact page and print styling
  assert.ok(html.includes('@page {'), 'HTML must declare @page rules')
  assert.ok(html.includes('size: A4 portrait;'), 'Must enforce A4 portrait sizing')
  assert.ok(html.includes('-webkit-print-color-adjust: exact'), 'Must force exact print color adjustment')
  assert.ok(html.includes('color: #020617'), 'Must enforce deep navy/black print ink')

  // 2. Verify student metadata
  assert.ok(html.includes('Amina Nakato'), 'Must include student name')
  assert.ok(html.includes('JID/2026/088'), 'Must include admission number')
  assert.ok(html.includes('Primary Four'), 'Must include class name')

  // 3. Verify subjects & marks
  assert.ok(html.includes('English'), 'Must include secular subject English')
  assert.ok(html.includes('Mathematics'), 'Must include secular subject Mathematics')
  assert.ok(html.includes('القرآن الكريم'), 'Must include theology subject Quran')

  // 4. Verify aggregates and division
  assert.ok(html.includes('Total Aggregates:'), 'Must include aggregates')
  assert.ok(html.includes('Division 1'), 'Must include Division 1')
})

test('Epic 2: In-memory job state and transitions', async () => {
  const jobId = crypto.randomUUID()
  const initialJob = {
    id: jobId,
    school_id: 'c0000000-0000-0000-0000-000000000001',
    status: 'pending',
    progress_current: 0,
    progress_total: 10,
    file_url: null,
    file_name: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 1. Save and retrieve job
  await saveJob(initialJob)
  const retrieved = await getJobById(jobId)
  assert.ok(retrieved, 'Job must be retrieved from store')
  assert.equal(retrieved.status, 'pending')
  assert.equal(retrieved.progress_current, 0)
  assert.equal(retrieved.progress_total, 10)

  // 2. Update progress
  retrieved.status = 'processing'
  retrieved.progress_current = 5
  await saveJob(retrieved)

  const updated = await getJobById(jobId)
  assert.equal(updated.status, 'processing')
  assert.equal(updated.progress_current, 5)

  // 3. Terminal completion state
  updated.status = 'completed'
  updated.progress_current = 10
  updated.file_url = `/api/jobs/reports/download?job_id=${jobId}`
  updated.file_name = `ReportCards_Batch_${jobId.slice(0, 8)}.zip`
  await saveJob(updated)

  const completed = await getJobById(jobId)
  assert.equal(completed.status, 'completed')
  assert.equal(completed.file_url, `/api/jobs/reports/download?job_id=${jobId}`)
})

test('Epic 2: Zip archive storage and retrieval', () => {
  const jobId = crypto.randomUUID()
  const testBuffer = Buffer.from('Mock zip buffer content')

  storeZipArchive(jobId, {
    buffer: testBuffer,
    fileName: `test_${jobId}.zip`,
    contentType: 'application/zip',
  })

  const retrieved = getZipArchive(jobId)
  assert.ok(retrieved, 'Archive must be retrieved')
  assert.equal(retrieved.fileName, `test_${jobId}.zip`)
  assert.equal(retrieved.buffer.toString(), 'Mock zip buffer content')
})

test('Epic 2: Headless Puppeteer and JSZip batch export end-to-end execution', async () => {
  const jobId = crypto.randomUUID()
  const job = {
    id: jobId,
    school_id: 'c0000000-0000-0000-0000-000000000001',
    status: 'pending',
    progress_current: 0,
    progress_total: 2,
    file_url: null,
    file_name: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await saveJob(job)

  // Execute batch export worker (without Supabase admin, utilizing local fallback data)
  await processBatchExportJob(jobId, {
    job_id: jobId,
    school_id: 'c0000000-0000-0000-0000-000000000001',
    score_type: 'mot',
    curriculum: 'combined',
  }, null)

  const finishedJob = await getJobById(jobId)
  assert.ok(finishedJob, 'Job must exist')
  assert.equal(finishedJob.status, 'completed', 'Job must complete successfully')
  assert.equal(finishedJob.progress_current, finishedJob.progress_total, 'All reports must be processed')
  assert.ok(finishedJob.file_url, 'Download file_url must be populated')

  // Verify generated zip archive
  const zipArchive = getZipArchive(jobId)
  assert.ok(zipArchive, 'Zip archive must be stored in memory')
  assert.ok(zipArchive.buffer.length > 0, 'Zip archive buffer must not be empty')

  // Unpack and verify contents of the zip
  const loadedZip = await JSZip.loadAsync(zipArchive.buffer)
  const files = Object.keys(loadedZip.files)
  assert.ok(files.length >= 2, 'Zip archive must contain generated student PDFs')
  for (const f of files) {
    assert.ok(f.endsWith('.pdf'), `Every file in archive must be a PDF: ${f}`)
    const content = await loadedZip.file(f).async('nodebuffer')
    assert.ok(content.length > 1000, 'PDF buffer must have valid non-empty size')
  }
})
