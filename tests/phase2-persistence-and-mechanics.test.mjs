import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CANONICAL_ACCOUNT_ROLES,
  normalizeAccountRole,
  authorizeTeacherProfile,
  canAccessClass,
  classIdsForType,
} from '../src/lib/teacher-access.ts'
import {
  SCHOOL_CUSTOMIZATION_ACTION,
  fetchMergedSchoolSettings,
  resolveReportBranding,
  resolveReportGradingBands,
} from '../src/lib/school-settings-helper.ts'
import {
  POWERSYNC_INIT_TIMEOUT_MS,
  initializePowerSyncNonBlocking,
} from '../src/lib/powersync/runtime.ts'
import {
  isBroadcastNotificationRead,
  recordNotificationReadEventStrict,
  createSystemNotification,
} from '../src/lib/notifications.ts'

test('Phase 2.1 — Settings round-trip persistence & demonstrable change in report output', async () => {
  // Mock backend storage tables (school_settings + grading_criteria + activity_logs)
  const store = {
    school_settings: {
      id: 1,
      name: 'Jiddah Islamic Schools',
      address: 'P.O.Box 34008 Kampala (U)',
      district: 'Kampala',
      email: 'info@jiddah.ug',
      phone: '+256 700 000000',
      current_term: 'Term 1',
      current_year: 2026,
    },
    grading_criteria: [],
    activity_logs: [],
  }

  // Simulate saving updated settings to backend
  const savedUpdate = {
    name: 'Al-Noor Academy & Junior School',
    address: 'Plot 42 Makerere Hill Road, Kampala',
    phone: '+256 772 999888',
    email: 'registrar@alnoor.ac.ug',
    motto: 'Knowledge & Integrity',
    logo_url: '/custom_badge_2026.png',
    primary_font: 'Inter',
    arabic_font: 'Cairo',
    theme_color: '#1e3a8a',
    report_theme_preset: 'navy-silver',
    grading_scale: [
      { grade: 'D1', min: 92, max: 100, remark: 'Exceptional Mastery' },
      { grade: 'D2', min: 82, max: 91, remark: 'High Distinction' },
      { grade: 'C3', min: 72, max: 81, remark: 'Merit Credit' },
      { grade: 'F9', min: 0, max: 71, remark: 'Needs Support' },
    ],
    ranking_preferences: {
      method: 'standard',
      basis: 'total_score',
      scope: 'class',
      tiebreak: 'none',
      show_rank: true,
    },
    report_overlays: {
      'primary-eot': {
        stamp: { id: 'stamp', label: 'School Stamp', xPercent: 80, yPercent: 82, rotation: -5, opacity: 0.9, scale: 1, visible: true },
      },
    },
  }

  store.school_settings = {
    ...store.school_settings,
    name: savedUpdate.name,
    address: savedUpdate.address,
    phone: savedUpdate.phone,
    email: savedUpdate.email,
  }
  store.activity_logs.unshift({
    id: 'log-1',
    user_id: 'admin-1',
    action: SCHOOL_CUSTOMIZATION_ACTION,
    metadata: savedUpdate,
    created_at: new Date().toISOString(),
  })

  const mockSupabase = {
    from(table) {
      if (table === 'school_settings') {
        return {
          select() {
            return {
              limit() {
                return {
                  async maybeSingle() {
                    return { data: store.school_settings, error: null }
                  },
                }
              },
            }
          },
        }
      }
      if (table === 'activity_logs') {
        return {
          select() {
            return {
              eq(col, val) {
                const filtered = store.activity_logs.filter((row) => row[col] === val)
                return {
                  order() {
                    return {
                      async limit() {
                        return { data: filtered.slice(0, 1), error: null }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const mergedSettings = await fetchMergedSchoolSettings(mockSupabase, store.grading_criteria)
  assert.equal(mergedSettings.name, 'Al-Noor Academy & Junior School')
  assert.equal(mergedSettings.logo_url, '/custom_badge_2026.png')
  assert.equal(mergedSettings.theme_color, '#1e3a8a')
  assert.equal(mergedSettings.report_theme_preset, 'navy-silver')
  assert.equal(mergedSettings.primary_font, 'Inter')
  assert.equal(mergedSettings.arabic_font, 'Cairo')
  assert.equal(mergedSettings.grading_scale[0].min, 92)

  // Verify demonstrable change in generated report output
  const reportData = { settings: mergedSettings }
  const branding = resolveReportBranding(reportData)
  const gradingBands = resolveReportGradingBands(reportData)

  assert.equal(branding.schoolName, 'AL-NOOR ACADEMY & JUNIOR SCHOOL')
  assert.equal(branding.address, 'Plot 42 Makerere Hill Road, Kampala')
  assert.equal(branding.phone, '+256 772 999888')
  assert.equal(branding.email, 'registrar@alnoor.ac.ug')
  assert.equal(branding.logoUrl, '/custom_badge_2026.png')
  assert.equal(branding.themeColor, '#1e3a8a')
  assert.equal(branding.themePreset, 'navy-silver')
  assert.equal(branding.primaryFont, 'Inter')
  assert.equal(branding.arabicFont, 'Cairo')

  assert.equal(gradingBands.length, 4)
  assert.equal(gradingBands[0].grade, 'D1')
  assert.equal(gradingBands[0].range, '92-100')
  assert.equal(gradingBands[0].remark, 'Exceptional Mastery')
})

test('Phase 2.2 — Consolidated 5-Role Model & Class Teacher Scoping', () => {
  assert.deepEqual(CANONICAL_ACCOUNT_ROLES, [
    'Administrator',
    'Head Teacher',
    'DOS Secular',
    'DOS Theology',
    'Class Teacher',
  ])

  assert.equal(normalizeAccountRole('admin'), 'Administrator')
  assert.equal(normalizeAccountRole('Headteacher'), 'Head Teacher')
  assert.equal(normalizeAccountRole('Deputy Head Teacher'), 'Head Teacher')
  assert.equal(normalizeAccountRole('DOS Secular'), 'DOS Secular')
  assert.equal(normalizeAccountRole('DOS Theology'), 'DOS Theology')
  assert.equal(normalizeAccountRole('Teacher'), 'Class Teacher')
  assert.equal(normalizeAccountRole('Class Teacher'), 'Class Teacher')

  const assignedP4Id = '11111111-2222-3333-4444-555555555555'
  const unassignedP5Id = '99999999-8888-7777-6666-555555555555'

  const teacherScope = authorizeTeacherProfile(
    { id: 't-1', role: 'Class Teacher', status: 'active' },
    [{ classId: assignedP4Id, classType: 'circular' }],
    'write'
  )

  assert.equal(canAccessClass(teacherScope, 'circular', assignedP4Id), true)
  assert.equal(canAccessClass(teacherScope, 'circular', unassignedP5Id), false)
  assert.deepEqual(classIdsForType(teacherScope, 'circular'), [assignedP4Id])
})

test('Phase 2.3 — Notification Lifecycle (create -> unread -> mark-read -> mark-all-read via activity_logs)', async () => {
  const notifications = []
  const activityLogs = []

  const mockSupabase = {
    from(table) {
      if (table === 'notifications') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      gte() {
                        return {
                          is() {
                            return {
                              async limit() {
                                return { data: [], error: null }
                              },
                            }
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
          insert(rows) {
            const row = Array.isArray(rows) ? rows[0] : rows
            const created = {
              id: notifications.length + 1,
              created_at: new Date().toISOString(),
              ...row,
            }
            notifications.push(created)
            return {
              select() {
                return {
                  async single() {
                    return { data: created, error: null }
                  },
                }
              },
            }
          },
        }
      }
      if (table === 'activity_logs') {
        return {
          async insert(rows) {
            const row = Array.isArray(rows) ? rows[0] : rows
            activityLogs.push({
              id: `act-${activityLogs.length + 1}`,
              created_at: new Date().toISOString(),
              ...row,
            })
            return { error: null }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  // 1. Creation
  await createSystemNotification(mockSupabase, {
    title: 'Marks Submitted',
    message: 'Primary 4 MOT marks saved',
    recipientId: null,
    priority: 'normal',
    type: 'report',
  })
  await createSystemNotification(mockSupabase, {
    title: 'Term Deadline',
    message: 'Submit EOT marks by Friday',
    recipientId: null,
    priority: 'high',
    type: 'deadline',
  })
  assert.equal(notifications.length, 2)

  // 2. Unread count before any read action
  const userId = 'teacher-user-1'
  let ctx = { readBroadcastIds: new Set(), markAllReadTimestamp: null }
  let unread = notifications.filter((n) => !isBroadcastNotificationRead(n.id, n.created_at, ctx)).length
  assert.equal(unread, 2)

  // 3. Mark single notification as read via activity_logs
  await recordNotificationReadEventStrict(mockSupabase, userId, 'mark_notification_read', {
    notificationId: notifications[0].id,
  })
  const readLog = activityLogs.find((l) => l.action === 'mark_notification_read')
  assert.ok(readLog)
  ctx.readBroadcastIds.add(String(JSON.parse(readLog.metadata).notificationId))
  unread = notifications.filter((n) => !isBroadcastNotificationRead(n.id, n.created_at, ctx)).length
  assert.equal(unread, 1)

  // 4. Mark all notifications as read via activity_logs
  const markAllIso = new Date(Date.now() + 1000).toISOString()
  await recordNotificationReadEventStrict(mockSupabase, userId, 'mark_all_notifications_read', {
    readAt: markAllIso,
  })
  const markAllLog = activityLogs.find((l) => l.action === 'mark_all_notifications_read')
  assert.ok(markAllLog)
  ctx.markAllReadTimestamp = new Date(JSON.parse(markAllLog.metadata).readAt).getTime()
  unread = notifications.filter((n) => !isBroadcastNotificationRead(n.id, n.created_at, ctx)).length
  assert.equal(unread, 0)
})

test('Phase 2.4 — PowerSync Non-Blocking 2-Second Timeout Fallback', async () => {
  assert.equal(POWERSYNC_INIT_TIMEOUT_MS, 2000)

  // Case A: PowerSync throws "Failed to fetch"
  const failedFetchClient = {
    async init() {},
    async connect() {
      throw new TypeError('Failed to fetch')
    },
  }
  const resFailed = await initializePowerSyncNonBlocking(failedFetchClient, {}, 200)
  assert.deepEqual(resFailed, { connected: false, fallbackToSupabase: true })

  // Case B: PowerSync hangs indefinitely -> resolves fallback after timeout without blocking
  const hangingClient = {
    async init() {},
    async connect() {
      await new Promise((resolve) => setTimeout(resolve, 10000))
    },
  }
  const start = Date.now()
  const resTimeout = await initializePowerSyncNonBlocking(hangingClient, {}, 150)
  const elapsed = Date.now() - start
  assert.deepEqual(resTimeout, { connected: false, fallbackToSupabase: true })
  assert.ok(elapsed < 1000, `Expected non-blocking timeout under 1000ms, took ${elapsed}ms`)
})
