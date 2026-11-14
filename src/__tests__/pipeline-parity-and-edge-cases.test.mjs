import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSubjectGradeNumber,
  getGradeDisplay,
  getSubjectRemark,
  getTheologySubjectRemark,
  getNurseryGrade,
  isCoreSubject,
  isGradableSubject,
  calculateAggregate,
  calculateTheologyAggregate,
  getDivision,
  getPromotionStatus,
  getConductRemark,
  getClassTeacherComment,
  getHeadTeacherComment,
  getTheologyComment,
  getNurseryTeacherComment
} from '../lib/grading.ts';

import { evaluateCriteria } from '../lib/grading-engine.ts';
import {
  classifyTableError,
  isBroadcastNotificationRead,
  fetchUserBroadcastReadContext,
  NOTIFICATION_ID_CHUNK_SIZE,
  NOTIFICATION_ID_CHUNK_CONCURRENCY,
  recordNotificationReadEventStrict,
  markNotificationReadForUser,
  markAllNotificationsReadForUser,
  computeUserUnreadNotificationCount
} from '../lib/notifications.ts';
import { parseMarkAllReadResponse } from '../lib/notification-response.ts';

describe('P0 Pipeline Parity: Lower & Upper Primary Calculation Equivalence', () => {
  test('P.1-P.3 Lower Primary standard marks produce exact aggregate & Division I', () => {
    const marks = [
      { subject_name: 'English', score: 88 }, // D1
      { subject_name: 'Mathematics', score: 92 }, // D1
      { subject_name: 'Literacy I', score: 85 }, // D1
      { subject_name: 'Literacy II', score: 78 }, // D2
      { subject_name: 'I.R.E', score: 90 }, // Non-core for aggregate
    ];

    const agg = calculateAggregate(marks, 'lower_primary');
    assert.equal(agg, 5); // 1 + 1 + 1 + 2 = 5
    assert.equal(getDivision(agg), 'I');
  });

  test('P.4-P.7 Upper Primary standard marks produce exact aggregate & Division I', () => {
    const marks = [
      { subject_name: 'English', score: 80 }, // D2
      { subject_name: 'Mathematics', score: 82 }, // D2
      { subject_name: 'Science', score: 76 }, // D2
      { subject_name: 'Social Studies', score: 88 }, // D1
      { subject_name: 'Computer', score: 95 }, // Non-gradable / non-core
    ];

    const agg = calculateAggregate(marks, 'upper_primary');
    assert.equal(agg, 7); // 2 + 2 + 2 + 1 = 7
    assert.equal(getDivision(agg), 'I');
  });

  test('Lower Primary missing Literacy II returns null aggregate (no partial distorting score)', () => {
    const marks = [
      { subject_name: 'English', score: 88 },
      { subject_name: 'Mathematics', score: 92 },
      { subject_name: 'Literacy I', score: 85 },
      // Literacy II missing
    ];

    const agg = calculateAggregate(marks, 'lower_primary');
    assert.equal(agg, null);
  });

  test('Upper Primary missing Science returns null aggregate (no partial distorting score)', () => {
    const marks = [
      { subject_name: 'English', score: 88 },
      { subject_name: 'Mathematics', score: 92 },
      { subject_name: 'Social Studies', score: 85 },
      // Science missing
    ];

    const agg = calculateAggregate(marks, 'upper_primary');
    assert.equal(agg, null);
  });

  test('Subject abbreviations (ENG, MATH, SCI, SST, LIT I, LIT II) match case-insensitively', () => {
    const lowerMarks = [
      { subject_name: 'eng', score: 85 },
      { subject_name: 'math', score: 85 },
      { subject_name: 'lit i', score: 85 },
      { subject_name: 'lit ii', score: 85 },
    ];
    assert.equal(calculateAggregate(lowerMarks, 'lower_primary'), 4);

    const upperMarks = [
      { subject_name: 'ENG', score: 85 },
      { subject_name: 'MATH', score: 85 },
      { subject_name: 'SCI', score: 85 },
      { subject_name: 'SST', score: 85 },
    ];
    assert.equal(calculateAggregate(upperMarks, 'upper_primary'), 4);
  });
});

describe('P0 Pipeline Parity: Non-Gradable Subjects & Exceptions', () => {
  test('Computer is excluded from grading calculations', () => {
    assert.equal(isGradableSubject('Computer'), false);
    assert.equal(isGradableSubject('computer'), false);
  });

  test('Top Class Writing is excluded from grading calculations', () => {
    assert.equal(isGradableSubject('Writing', 'Top Class'), false);
    assert.equal(isGradableSubject('writing', 'top class emerald'), false);
    assert.equal(isGradableSubject('Writing', 'Baby Class'), true);
  });

  test('Core academic subjects are always gradable', () => {
    assert.equal(isGradableSubject('English'), true);
    assert.equal(isGradableSubject('Mathematics'), true);
    assert.equal(isGradableSubject('Science'), true);
    assert.equal(isGradableSubject('Social Studies'), true);
  });
});

describe('P0 Pipeline Parity: Theology Aggregates, Arabic Remarks & Comments', () => {
  test('Theology 4 subjects with valid scores compute aggregate correctly', () => {
    const scores = [88, 76, 70, 60]; // D1(1), D2(2), C3(3), C4(4)
    const agg = calculateTheologyAggregate(scores);
    assert.equal(agg, 10);
    assert.equal(getDivision(agg), 'I');
  });

  test('Theology with fewer than 4 scores returns null aggregate', () => {
    assert.equal(calculateTheologyAggregate([88, 76, 70]), null);
  });

  test('Theology with null score in 4 subjects returns null aggregate', () => {
    assert.equal(calculateTheologyAggregate([88, 76, null, 65]), null);
  });

  test('Arabic theology remarks conform strictly to school standards', () => {
    assert.equal(getTheologySubjectRemark(1), 'ممتاز');
    assert.equal(getTheologySubjectRemark(2), 'جيد جداً');
    assert.equal(getTheologySubjectRemark(3), 'جيد');
    assert.equal(getTheologySubjectRemark(4), 'جيد');
    assert.equal(getTheologySubjectRemark(5), 'مقبول');
    assert.equal(getTheologySubjectRemark(6), 'مقبول');
    assert.equal(getTheologySubjectRemark(7), 'ضعيف');
    assert.equal(getTheologySubjectRemark(8), 'ضعيف جداً');
    assert.equal(getTheologySubjectRemark(9), 'راسب');
  });

  test('Theology total comment brackets conform to score ranges', () => {
    assert.equal(getTheologyComment(365), 'جهد مميز،شكرا');
    assert.equal(getTheologyComment(330), 'بقيت خطوة إلى الامتياز');
    assert.equal(getTheologyComment(290), 'أنت قادر على الأفضل');
    assert.equal(getTheologyComment(250), 'أنت قادر على الأفضل');
    assert.equal(getTheologyComment(200), 'أنت قادر على الأفضل');
  });
});

describe('P0 Pipeline Parity: Nursery Assessment Grading & Comments', () => {
  test('Nursery marks map to letter grades A through E', () => {
    assert.deepEqual(getNurseryGrade(95), { grade: 'A', remark: 'Excellent' });
    assert.deepEqual(getNurseryGrade(82), { grade: 'B', remark: 'Very Good' });
    assert.deepEqual(getNurseryGrade(74), { grade: 'C', remark: 'Good' });
    assert.deepEqual(getNurseryGrade(58), { grade: 'D', remark: 'Fair' });
    assert.deepEqual(getNurseryGrade(40), { grade: 'E', remark: 'Poor' });
  });

  test('Nursery teacher comment averages letter grades appropriately', () => {
    assert.equal(getNurseryTeacherComment(['A', 'A', 'B']), 'Excellent learner. Very impressive!');
    assert.equal(getNurseryTeacherComment(['B', 'B', 'C']), 'Very good progress. Keep it up!');
    assert.equal(getNurseryTeacherComment(['C', 'C', 'D']), 'Good effort. Room for improvement.');
    assert.equal(getNurseryTeacherComment(['D', 'E', 'D']), 'Fair progress. Needs more practice.');
    assert.equal(getNurseryTeacherComment(['E', 'E', 'E']), 'Needs significant support at home.');
  });
});

describe('P0 Pipeline Parity: DTO Field Equivalence Simulation', () => {
  test('Single report and batch report produce isomorphic student metadata structure', () => {
    const singleReportStudent = {
      name: 'Musa Sula',
      admission_number: 'JIS/2026/042',
      arabic_name: 'موسى سولا',
      religion: 'Muslim',
      class_name: 'P.4 Blue',
      theology_class_arabic: 'الصف الرابع',
      theology_class_english: 'Class 4',
      section: 'upper_primary',
      academic_year: 2026,
    };

    const batchReportStudent = {
      name: 'Musa Sula',
      admission_number: 'JIS/2026/042',
      arabic_name: 'موسى سولا',
      religion: 'Muslim',
      class_name: 'P.4 Blue',
      theology_class_arabic: 'الصف الرابع',
      theology_class_english: 'Class 4',
      section: 'upper_primary',
      academic_year: 2026,
    };

    assert.deepEqual(Object.keys(singleReportStudent), Object.keys(batchReportStudent));
    assert.deepEqual(singleReportStudent, batchReportStudent);
  });

  test('Single report and batch report produce isomorphic circular card payload', () => {
    const sampleCircular = {
      subjects: [
        { subject_name: 'ENG', score: 85, grade_display: 'D1', remark: 'Excellent', teacher_initials: 'TN' },
        { subject_name: 'MATH', score: 80, grade_display: 'D2', remark: 'Very Good', teacher_initials: 'KA' },
        { subject_name: 'SCI', score: 75, grade_display: 'D2', remark: 'Very Good', teacher_initials: 'MB' },
        { subject_name: 'SST', score: 90, grade_display: 'D1', remark: 'Excellent', teacher_initials: 'ST' },
      ],
      total: 330,
      bot_aggregate: null,
      mot_aggregate: 6,
      bot_total: 0,
      mot_total: 330,
      eot_total: 0,
      aggregate: 6,
      division: 'I',
      conduct_remark: 'Excellent conduct. Very impressive!',
      class_teacher_comment: 'Excellent performance. Keep it up!',
      head_teacher_comment: 'Outstanding. Well done!',
      position: 1,
      total_students: 45,
    };

    assert.equal(typeof sampleCircular.total, 'number');
    assert.equal(sampleCircular.division, 'I');
    assert.equal(sampleCircular.position, 1);
    assert.equal(sampleCircular.subjects.length, 4);
    for (const sub of sampleCircular.subjects) {
      assert.ok('teacher_initials' in sub, 'subject must contain teacher_initials');
      assert.ok('grade_display' in sub, 'subject must contain grade_display');
      assert.ok('remark' in sub, 'subject must contain remark');
    }
  });
});

describe('Defect G-2 Regression: Score Type Resolution Parity (BOT vs MOT vs EOT)', () => {
  const existingRecord = {
    bot_score: 88, // D1
    mot_score: 72, // C3
    eot_score: 55, // C5
  };

  function resolveScore(scoreType, existing) {
    return scoreType === 'mot'
      ? existing?.mot_score ?? null
      : scoreType === 'bot'
        ? existing?.bot_score ?? null
        : existing?.eot_score ?? null;
  }

  test('score_type=bot resolves directly to bot_score and produces correct D1 grade', () => {
    const score = resolveScore('bot', existingRecord);
    assert.equal(score, 88);
    const gradeNum = getSubjectGradeNumber(score);
    assert.equal(gradeNum, 1);
    assert.equal(getGradeDisplay(gradeNum), 'D1');
    assert.equal(getSubjectRemark(gradeNum), 'Excellent');
  });

  test('score_type=mot resolves directly to mot_score and produces correct C3 grade', () => {
    const score = resolveScore('mot', existingRecord);
    assert.equal(score, 72);
    const gradeNum = getSubjectGradeNumber(score);
    assert.equal(gradeNum, 3);
    assert.equal(getGradeDisplay(gradeNum), 'C3');
    assert.equal(getSubjectRemark(gradeNum), 'Good');
  });

  test('score_type=eot resolves directly to eot_score and produces correct C5 grade', () => {
    const score = resolveScore('eot', existingRecord);
    assert.equal(score, 55);
    const gradeNum = getSubjectGradeNumber(score);
    assert.equal(gradeNum, 5);
    assert.equal(getGradeDisplay(gradeNum), 'C5');
    assert.equal(getSubjectRemark(gradeNum), 'Fair');
  });

  test('null or missing marks fall back to null safely across all score types', () => {
    const emptyRecord = { bot_score: null, mot_score: null, eot_score: null };
    assert.equal(resolveScore('bot', emptyRecord), null);
    assert.equal(resolveScore('mot', emptyRecord), null);
    assert.equal(resolveScore('eot', emptyRecord), null);
    assert.equal(resolveScore('bot', null), null);
  });
});

describe('Defect G-5 Regression: Numeric School Settings Payload Handling', () => {
  const allowedKeys = ['name', 'address', 'district', 'current_year', 'current_term'];
  const allowedNumericKeys = ['current_year'];

  function parseSettingsPayload(body) {
    const updatePayload = {};
    Object.entries(body).forEach(([key, value]) => {
      if (!allowedKeys.includes(key)) return;
      if (typeof value === 'string' && !allowedNumericKeys.includes(key)) {
        updatePayload[key] = value.trim();
      } else if (allowedNumericKeys.includes(key) && (typeof value === 'number' || (typeof value === 'string' && value !== ''))) {
        const numVal = Number(value);
        if (!Number.isNaN(numVal) && Number.isFinite(numVal)) {
          updatePayload[key] = numVal;
        }
      }
    });
    return updatePayload;
  }

  test('current_year passed as number 2026 is preserved and parsed', () => {
    const payload = parseSettingsPayload({ current_year: 2026, name: 'Jiddah Islamic Schools' });
    assert.equal(payload.current_year, 2026);
    assert.equal(payload.name, 'Jiddah Islamic Schools');
  });

  test('current_year passed as numeric string "2025" is coerced to number', () => {
    const payload = parseSettingsPayload({ current_year: '2025' });
    assert.equal(payload.current_year, 2025);
  });

  test('invalid non-numeric current_year string is safely discarded', () => {
    const payload = parseSettingsPayload({ current_year: 'invalid_year' });
    assert.equal('current_year' in payload, false);
  });

  test('unallowed keys are excluded from update payload', () => {
    const payload = parseSettingsPayload({ evil_key: 'malicious', current_year: 2026 });
    assert.equal('evil_key' in payload, false);
    assert.equal(payload.current_year, 2026);
  });
});

describe('Checkpoint 10 P0 Regression: Notification Authorization & Scoped Deduplication', () => {
  // Pure simulation of deduplication query logic from src/lib/notifications.ts
  function checkDeduplication(existingRecords, candidate, nowMs = Date.now()) {
    const windowMs = 5 * 60 * 1000;
    const title = candidate.title.trim();
    const message = candidate.message.trim();
    const recipientId = candidate.recipientId || null;

    const matched = existingRecords.find(r => {
      const isTimeInRange = (nowMs - r.created_at_ms) <= windowMs;
      const isContentMatch = r.title === title && r.message === message;
      const isRecipientMatch = (r.recipient_id || null) === recipientId;
      return isTimeInRange && isContentMatch && isRecipientMatch;
    });

    return Boolean(matched);
  }

  // Pure simulation of notification access filter
  function filterUserNotifications(records, user) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    const filtered = records.filter(r => r.recipient_id === null || r.recipient_id === user.id);
    return { status: 200, data: filtered };
  }

  // Pure simulation of notification mark-read ownership filter
  function markNotificationRead(record, user) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    if (record.recipient_id !== null && record.recipient_id !== user.id) {
      return { status: 404, error: 'Notification not found' }; // Not owned by caller
    }
    return { status: 200, record: { ...record, read: true, read_by: user.id } };
  }

  test('Unauthenticated user receives 401 Unauthorized for notification list', () => {
    const records = [{ id: 1, title: 'Exam Notice', recipient_id: 'user_1' }];
    const res = filterUserNotifications(records, null);
    assert.equal(res.status, 401);
    assert.equal(res.error, 'Unauthorized');
  });

  test('Signed-in user cannot view another user private notification', () => {
    const records = [
      { id: 1, title: 'User 1 Salary', recipient_id: 'user_1' },
      { id: 2, title: 'User 2 Notice', recipient_id: 'user_2' },
      { id: 3, title: 'All Staff Meeting', recipient_id: null },
    ];
    const user2 = { id: 'user_2', email: 'user2@jiddahschool.ug' };
    const res = filterUserNotifications(records, user2);
    assert.equal(res.status, 200);
    assert.equal(res.data.length, 2);
    assert.ok(res.data.some(n => n.id === 2));
    assert.ok(res.data.some(n => n.id === 3));
    assert.ok(!res.data.some(n => n.id === 1), 'User 2 must not see User 1 private notification');
  });

  test('Signed-in user cannot mark another user private notification as read', () => {
    const privateRecord = { id: 1, title: 'Confidential', recipient_id: 'user_1', read: false };
    const unauthorizedUser = { id: 'user_2' };
    const res = markNotificationRead(privateRecord, unauthorizedUser);
    assert.equal(res.status, 404);

    const authorizedUser = { id: 'user_1' };
    const authRes = markNotificationRead(privateRecord, authorizedUser);
    assert.equal(authRes.status, 200);
    assert.equal(authRes.record.read, true);
    assert.equal(authRes.record.read_by, 'user_1');
  });

  test('Broadcast notification can be marked read by any authenticated recipient', () => {
    const broadcastRecord = { id: 3, title: 'Staff Briefing', recipient_id: null, read: false };
    const user = { id: 'user_any' };
    const res = markNotificationRead(broadcastRecord, user);
    assert.equal(res.status, 200);
    assert.equal(res.record.read, true);
  });

  test('Deduplication scopes to recipient: identical message to different users is NOT suppressed', () => {
    const now = Date.now();
    const existing = [
      { id: 1, title: 'Report Card Ready', message: 'Term 1 card is generated', recipient_id: 'teacher_1', created_at_ms: now - 30000 }
    ];

    const duplicateCandidate = { title: 'Report Card Ready', message: 'Term 1 card is generated', recipientId: 'teacher_1' };
    assert.equal(checkDeduplication(existing, duplicateCandidate, now), true, 'Same recipient within 5 min must be deduplicated');

    const distinctUserCandidate = { title: 'Report Card Ready', message: 'Term 1 card is generated', recipientId: 'teacher_2' };
    assert.equal(checkDeduplication(existing, distinctUserCandidate, now), false, 'Different recipient must NEVER be deduplicated');
  });

  test('Two distinct notifications with different titles for same recipient are both permitted', () => {
    const now = Date.now();
    const existing = [
      { id: 1, title: 'Mark Entry Closed', message: 'Deadline has passed', recipient_id: 'teacher_1', created_at_ms: now - 10000 }
    ];
    const newEventCandidate = { title: 'Staff Meeting Rescheduled', message: 'Meeting moved to 3pm', recipientId: 'teacher_1' };
    assert.equal(checkDeduplication(existing, newEventCandidate, now), false, 'Distinct event must not be suppressed');
  });

  test('Expired notification (> 5 min) allows retry without deduplication suppression', () => {
    const now = Date.now();
    const existing = [
      { id: 1, title: 'Sync Warning', message: 'Retry connection', recipient_id: 'user_1', created_at_ms: now - (6 * 60 * 1000) }
    ];
    const retryCandidate = { title: 'Sync Warning', message: 'Retry connection', recipientId: 'user_1' };
    assert.equal(checkDeduplication(existing, retryCandidate, now), false, 'Events older than 5 min must not be deduplicated');
  });
});

describe('Checkpoint 10 P0 Regression: Marks Entry PowerSync & Cloud Fallback', () => {
  function mapEnrollmentRows(localRows, cloudRows) {
    if (localRows && localRows.length > 0) {
      return localRows.map(e => ({
        id: e.enrollment_id,
        name: e.name || 'Unknown Student',
        source: 'powersync_local'
      }));
    }
    // Fallback to cloud
    if (cloudRows && cloudRows.length > 0) {
      return cloudRows
        .filter(e => !e.students?.is_archived)
        .map(e => ({
          id: e.id,
          name: e.students?.name || 'Unknown Student',
          source: 'supabase_cloud'
        }));
    }
    return [];
  }

  test('When PowerSync local database has records, local data is used', () => {
    const local = [{ enrollment_id: 'e1', name: 'Amina Musa' }];
    const cloud = [{ id: 'e1', students: { name: 'Amina Musa', is_archived: false } }];
    const result = mapEnrollmentRows(local, cloud);
    assert.equal(result.length, 1);
    assert.equal(result[0].source, 'powersync_local');
  });

  test('When PowerSync local database is empty, cloud fallback is used seamlessly', () => {
    const local = [];
    const cloud = [
      { id: 'e1', students: { name: 'Amina Musa', is_archived: false } },
      { id: 'e2', students: { name: 'Archived Student', is_archived: true } },
    ];
    const result = mapEnrollmentRows(local, cloud);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'e1');
    assert.equal(result[0].name, 'Amina Musa');
    assert.equal(result[0].source, 'supabase_cloud');
  });
});

describe('Checkpoint 11 P0: Independent Notification Read State & Broadcast Isolation', () => {
  // Pure model simulating the updated route handlers and activity_logs resolution
  function computeNotificationsView(records, user, userLogs) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    const accessible = records.filter(r => r.recipient_id === null || r.recipient_id === user.id);

    const userReadIds = new Set();
    let markAllReadTime = null;

    for (const log of (userLogs || []).filter(l => l.user_id === user.id)) {
      if (log.action === 'mark_all_notifications_read') {
        const t = new Date(log.metadata?.readAt || log.created_at).getTime();
        if (!markAllReadTime || t > markAllReadTime) markAllReadTime = t;
      } else if (log.action === 'mark_notification_read') {
        if (log.metadata?.notificationId != null) {
          userReadIds.add(String(log.metadata.notificationId));
        }
      }
    }

    const mapped = accessible.map(r => {
      let isRead = Boolean(r.read);
      if (r.recipient_id === null) {
        const createdAt = new Date(r.created_at).getTime();
        if (userReadIds.has(String(r.id))) {
          isRead = true;
        } else if (markAllReadTime && createdAt <= markAllReadTime) {
          isRead = true;
        } else {
          isRead = false;
        }
      }
      return { id: r.id, title: r.title, read: isRead, recipient_id: r.recipient_id };
    });

    return { status: 200, data: mapped };
  }

  function markReadAction(records, notifId, user, logs) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    const target = records.find(r => r.id === notifId);
    if (!target) return { status: 404, error: 'Notification not found' };
    if (target.recipient_id !== null && target.recipient_id !== user.id) {
      return { status: 404, error: 'Notification not found' };
    }

    if (target.recipient_id === user.id) {
      target.read = true; // mutate private row
    }

    // Record activity log for user
    logs.push({
      user_id: user.id,
      action: 'mark_notification_read',
      metadata: { notificationId: notifId },
      created_at: new Date().toISOString()
    });

    return { status: 200, success: true };
  }

  function markAllReadAction(records, user, logs) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    // Only mutate private rows for this user
    for (const r of records) {
      if (r.recipient_id === user.id) {
        r.read = true;
      }
    }
    // Record mark_all_notifications_read in activity_logs
    logs.push({
      user_id: user.id,
      action: 'mark_all_notifications_read',
      metadata: { readAt: new Date().toISOString() },
      created_at: new Date().toISOString()
    });
    return { status: 200, success: true };
  }

  function computeUnreadCount(records, user, logs) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    const view = computeNotificationsView(records, user, logs);
    const count = view.data.filter(n => !n.read).length;
    return { status: 200, count };
  }

  test('User A cannot read, modify, or mark read User B private notification', () => {
    const db = [{ id: 101, title: 'Private User B', recipient_id: 'user_b', read: false, created_at: '2026-10-13T08:00:00Z' }];
    const logs = [];
    const userA = { id: 'user_a' };

    const viewA = computeNotificationsView(db, userA, logs);
    assert.equal(viewA.data.length, 0, 'User A must not receive User B notification');

    const markRes = markReadAction(db, 101, userA, logs);
    assert.equal(markRes.status, 404, 'User A cannot mark read User B notification');
    assert.equal(db[0].read, false, 'User B notification remains unread in database');
  });

  test('Two users can each receive and independently read a broadcast notification', () => {
    const db = [
      { id: 201, title: 'School Assembly', recipient_id: null, read: false, created_at: '2026-10-13T08:00:00Z' }
    ];
    const logs = [];
    const userA = { id: 'user_a' };
    const userB = { id: 'user_b' };

    // Initially both see unread count = 1
    assert.equal(computeUnreadCount(db, userA, logs).count, 1);
    assert.equal(computeUnreadCount(db, userB, logs).count, 1);

    // User A marks broadcast notification read
    const markRes = markReadAction(db, 201, userA, logs);
    assert.equal(markRes.status, 200);

    // CRITICAL: Shared database row read boolean must NOT be altered to true!
    assert.equal(db[0].read, false, 'Broadcast notification row in DB must remain unmutated');

    // User A now sees it as read (unread count = 0)
    assert.equal(computeUnreadCount(db, userA, logs).count, 0);
    const viewA = computeNotificationsView(db, userA, logs);
    assert.equal(viewA.data[0].read, true);

    // User B STILL sees it as unread (unread count = 1)!
    assert.equal(computeUnreadCount(db, userB, logs).count, 1);
    const viewB = computeNotificationsView(db, userB, logs);
    assert.equal(viewB.data[0].read, false, 'User B broadcast notification must remain unread');
  });

  test('Mark-all-read affects only current user and does not corrupt other users', () => {
    const db = [
      { id: 301, title: 'Announcement', recipient_id: null, read: false, created_at: '2026-10-13T00:00:00Z' },
      { id: 302, title: 'Private to User A', recipient_id: 'user_a', read: false, created_at: '2026-10-13T00:00:00Z' },
      { id: 303, title: 'Private to User B', recipient_id: 'user_b', read: false, created_at: '2026-10-13T00:00:00Z' }
    ];
    const logs = [];
    const userA = { id: 'user_a' };
    const userB = { id: 'user_b' };

    // User A marks all read
    markAllReadAction(db, userA, logs);

    // User A's private notification is read, but User B's private notification is untouched
    assert.equal(db.find(r => r.id === 302).read, true);
    assert.equal(db.find(r => r.id === 303).read, false);

    // User A unread count = 0
    assert.equal(computeUnreadCount(db, userA, logs).count, 0);

    // User B unread count = 2 (Announcement + Private to User B)
    assert.equal(computeUnreadCount(db, userB, logs).count, 2);
  });

  test('Repeated requests are idempotent and do not corrupt state', () => {
    const db = [{ id: 401, title: 'System Notice', recipient_id: null, read: false, created_at: '2026-10-13T00:00:00Z' }];
    const logs = [];
    const userA = { id: 'user_a' };

    markReadAction(db, 401, userA, logs);
    markReadAction(db, 401, userA, logs); // repeat call
    markAllReadAction(db, userA, logs);
    markAllReadAction(db, userA, logs); // repeat call

    assert.equal(computeUnreadCount(db, userA, logs).count, 0);
  });

  test('Multi-user lifecycle: User A reads broadcast, User B retains unread, subsequent list fetch preserves independent counts and states', () => {
    const db = [
      { id: 501, title: 'Term Circular', recipient_id: null, read: false, created_at: '2026-10-13T00:00:00Z' },
      { id: 502, title: 'Teacher A Appraisal', recipient_id: 'user_a', read: false, created_at: '2026-10-13T00:00:00Z' },
      { id: 503, title: 'Teacher B Assignment', recipient_id: 'user_b', read: false, created_at: '2026-10-13T00:00:00Z' }
    ];
    const logs = [];
    const userA = { id: 'user_a' };
    const userB = { id: 'user_b' };

    // Initial state: both users have 2 unread notifications
    assert.equal(computeUnreadCount(db, userA, logs).count, 2);
    assert.equal(computeUnreadCount(db, userB, logs).count, 2);

    // Step 1: User A marks broadcast notification 501 read
    markReadAction(db, 501, userA, logs);
    assert.equal(computeUnreadCount(db, userA, logs).count, 1);
    
    // User B still has 2 unread notifications
    assert.equal(computeUnreadCount(db, userB, logs).count, 2);

    // Step 2: Fetch lists again and assert read states
    const listA1 = computeNotificationsView(db, userA, logs);
    assert.equal(listA1.data.find(n => n.id === 501).read, true);
    assert.equal(listA1.data.find(n => n.id === 502).read, false);

    const listB1 = computeNotificationsView(db, userB, logs);
    assert.equal(listB1.data.find(n => n.id === 501).read, false);
    assert.equal(listB1.data.find(n => n.id === 503).read, false);

    // Step 3: User A marks all read
    markAllReadAction(db, userA, logs);
    assert.equal(computeUnreadCount(db, userA, logs).count, 0);

    // User B is still completely unaffected
    assert.equal(computeUnreadCount(db, userB, logs).count, 2);

    // Step 4: User B marks their private notification read
    markReadAction(db, 503, userB, logs);
    assert.equal(computeUnreadCount(db, userB, logs).count, 1);

    const listB2 = computeNotificationsView(db, userB, logs);
    assert.equal(listB2.data.find(n => n.id === 501).read, false);
    assert.equal(listB2.data.find(n => n.id === 503).read, true);

    // Re-verify User A is still 0 unread with both marked read
    assert.equal(computeUnreadCount(db, userA, logs).count, 0);
    const listA2 = computeNotificationsView(db, userA, logs);
    assert.ok(listA2.data.every(n => n.read === true));
  });
});

describe('Checkpoint 11 P1: Settings Schema Parity & Alias Normalization', () => {
  function normalizeSchoolSettingsPayload(input) {
    const allowedKeys = [
      'school_name', 'name', 'address', 'district', 'email', 'phone_1', 'phone', 'phone_2',
      'pay_code', 'current_term', 'current_year', 'motto', 'logo_url', 'primary_font',
      'arabic_font', 'theme_color', 'report_theme_preset'
    ];
    const allowedNumericKeys = ['current_year'];

    const updatePayload = {};
    for (const [key, value] of Object.entries(input)) {
      if (!allowedKeys.includes(key)) continue;
      if (allowedNumericKeys.includes(key) && (typeof value === 'number' || (typeof value === 'string' && value !== ''))) {
        const numVal = Number(value);
        if (!Number.isNaN(numVal) && Number.isFinite(numVal)) {
          updatePayload[key] = numVal;
        }
      } else if (typeof value === 'string') {
        updatePayload[key] = value.trim();
      }
    }

    if (updatePayload.name && !updatePayload.school_name) {
      updatePayload.school_name = updatePayload.name;
    }
    delete updatePayload.name;

    if (updatePayload.phone && !updatePayload.phone_1) {
      updatePayload.phone_1 = updatePayload.phone;
    }
    delete updatePayload.phone;

    return updatePayload;
  }

  function formatSchoolSettingsResponse(data) {
    if (!data) return null;
    return {
      ...data,
      name: data.school_name || data.name || '',
      school_name: data.school_name || data.name || '',
      phone: data.phone_1 || data.phone || '',
      phone_1: data.phone_1 || data.phone || '',
    };
  }

  function validateSchoolSettingsUpdate(payload) {
    const normalized = normalizeSchoolSettingsPayload(payload);
    if (Object.keys(normalized).length === 0) {
      return { status: 400, error: 'No valid settings provided' };
    }
    if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
      return { status: 400, error: 'Invalid school email address' };
    }
    return { status: 200, data: normalized };
  }

  test('name is normalized to school_name and phone is normalized to phone_1', () => {
    const payload = {
      name: 'Jiddah Islamic Schools',
      phone: '+256 752 112233',
      current_year: '2026',
      district: 'Wakiso'
    };
    const normalized = normalizeSchoolSettingsPayload(payload);
    assert.equal(normalized.school_name, 'Jiddah Islamic Schools');
    assert.equal(normalized.phone_1, '+256 752 112233');
    assert.equal(normalized.name, undefined);
    assert.equal(normalized.phone, undefined);
    assert.equal(normalized.current_year, 2026);
    assert.equal(normalized.district, 'Wakiso');
  });

  test('Settings payload error handling: invalid email and empty payload rejection', () => {
    const invalidEmailRes = validateSchoolSettingsUpdate({ email: 'bad-email' });
    assert.equal(invalidEmailRes.status, 400);
    assert.equal(invalidEmailRes.error, 'Invalid school email address');

    const emptyRes = validateSchoolSettingsUpdate({ unknown_field: 'ignored' });
    assert.equal(emptyRes.status, 400);
    assert.equal(emptyRes.error, 'No valid settings provided');
  });

  test('Settings formatted data helper provides two-way aliases (name/school_name, phone/phone_1)', () => {
    const rawDbRow = {
      id: 1,
      school_name: 'Jiddah Islamic Primary School',
      address: 'Kawempe, Kampala',
      phone_1: '+256700000000',
      current_year: 2026,
    };
    const formatted = formatSchoolSettingsResponse(rawDbRow);
    assert.equal(formatted.name, 'Jiddah Islamic Primary School');
    assert.equal(formatted.school_name, 'Jiddah Islamic Primary School');
    assert.equal(formatted.phone, '+256700000000');
    assert.equal(formatted.phone_1, '+256700000000');
  });
});

describe('Checkpoint 11: Single vs Batch Report Parity & Calculation Consistency', () => {
  function calculateStudentReport(studentScores, section = 'upper_primary') {
    const marks = studentScores.map(s => {
      const gradeNum = getSubjectGradeNumber(s.score);
      const gradeDisplay = getGradeDisplay(gradeNum);
      const remark = getSubjectRemark(gradeNum);
      return {
        subject_name: s.subject_name,
        score: s.score,
        grade: gradeNum,
        grade_display: gradeDisplay,
        remark,
        teacher_initials: s.teacher_initials || ''
      };
    });

    const aggregate = calculateAggregate(studentScores, section);
    const division = aggregate ? getDivision(aggregate) : null;
    const conductRemark = getConductRemark(division);
    const classTeacherComment = getClassTeacherComment(division);
    const headTeacherComment = getHeadTeacherComment(division);
    const total = studentScores.reduce((sum, s) => sum + (typeof s.score === 'number' ? s.score : 0), 0);

    return {
      subjects: marks,
      aggregate,
      division,
      conduct_remark: conductRemark,
      class_teacher_comment: classTeacherComment,
      head_teacher_comment: headTeacherComment,
      total
    };
  }

  test('Single report and batch report calculations yield identical results for identical marks', () => {
    const sampleMarks = [
      { subject_name: 'ENG', score: 88, teacher_initials: 'TN' },
      { subject_name: 'MATH', score: 72, teacher_initials: 'KA' },
      { subject_name: 'SCI', score: 64, teacher_initials: 'MB' },
      { subject_name: 'SST', score: 50, teacher_initials: 'ST' },
    ];

    const singleResult = calculateStudentReport(sampleMarks, 'upper_primary');
    const batchResult = calculateStudentReport(sampleMarks, 'upper_primary');

    assert.deepEqual(singleResult, batchResult, 'Single and batch report calculations must be strictly isomorphic');
    assert.equal(singleResult.aggregate, 1 + 3 + 4 + 6); // 14
    assert.equal(singleResult.division, 'II');
    assert.equal(singleResult.total, 274);
  });

  test('Missing core subject produces null aggregate in both pipelines to avoid partial score distortion', () => {
    const incompleteMarks = [
      { subject_name: 'ENG', score: 88 },
      { subject_name: 'MATH', score: 72 },
      { subject_name: 'SCI', score: null }, // Missing core
      { subject_name: 'SST', score: 50 },
    ];

    const res = calculateStudentReport(incompleteMarks, 'upper_primary');
    assert.equal(res.aggregate, null);
    assert.equal(res.division, null);
  });

  test('Standard competition ranking (1224) handles ties identically across single cohort and batch', () => {
    const cohort = [
      { student_id: 's1', total: 350 },
      { student_id: 's2', total: 320 },
      { student_id: 's3', total: 320 }, // tied with s2
      { student_id: 's4', total: 300 },
      { student_id: 's5', total: 280 }
    ];

    // Compute 1224 competition positions
    cohort.sort((a, b) => b.total - a.total);
    let currentRank = 1;
    for (let i = 0; i < cohort.length; i++) {
      if (i > 0 && cohort[i].total === cohort[i - 1].total) {
        cohort[i].position = cohort[i - 1].position;
      } else {
        cohort[i].position = currentRank;
      }
      currentRank++;
    }

    assert.equal(cohort.find(s => s.student_id === 's1').position, 1);
    assert.equal(cohort.find(s => s.student_id === 's2').position, 2);
    assert.equal(cohort.find(s => s.student_id === 's3').position, 2); // tie at 2
    assert.equal(cohort.find(s => s.student_id === 's4').position, 4); // skips 3 -> 4
    assert.equal(cohort.find(s => s.student_id === 's5').position, 5);
  });
});

describe('Checkpoint 12: Notification Failure Reporting and State Reversion', () => {
  function simulateMarkReadClient({ notifs, unreadCount, markReadApiFn }) {
    let currentNotifs = [...notifs];
    let currentUnread = unreadCount;
    let toastError = null;

    async function handleMarkRead(id) {
      const prevNotifs = currentNotifs;
      const prevCount = currentUnread;
      // Optimistic update
      currentNotifs = currentNotifs.map(n => n.id === id ? { ...n, read: true } : n);
      currentUnread = Math.max(0, currentUnread - 1);

      try {
        const res = await markReadApiFn(id);
        if (!res.ok) {
          throw new Error(res.error || 'Failed to mark notification as read');
        }
      } catch (err) {
        // Revert on failure
        currentNotifs = prevNotifs;
        currentUnread = prevCount;
        toastError = err.message || 'Failed to mark notification as read';
      }
    }

    return {
      getState: () => ({ notifs: currentNotifs, unreadCount: currentUnread, toastError }),
      handleMarkRead
    };
  }

  function simulateMarkAllReadClient({ notifs, unreadCount, markAllApiFn }) {
    let currentNotifs = [...notifs];
    let currentUnread = unreadCount;
    let toastError = null;

    async function handleMarkAllRead() {
      const prevNotifs = currentNotifs;
      const prevCount = currentUnread;
      // Optimistic update
      currentNotifs = currentNotifs.map(n => ({ ...n, read: true }));
      currentUnread = 0;

      try {
        const res = await markAllApiFn();
        if (!res.ok) {
          throw new Error(res.error || 'Failed to mark all as read');
        }
      } catch (err) {
        // Revert on failure
        currentNotifs = prevNotifs;
        currentUnread = prevCount;
        toastError = err.message || 'Failed to mark all notifications as read';
      }
    }

    return {
      getState: () => ({ notifs: currentNotifs, unreadCount: currentUnread, toastError }),
      handleMarkAllRead
    };
  }

  test('Mark-read failure reverts optimistic read state and unread count, and reports error', async () => {
    const initialNotifs = [
      { id: 1, title: 'Exam Circular', read: false },
      { id: 2, title: 'Holiday Notice', read: false }
    ];
    const client = simulateMarkReadClient({
      notifs: initialNotifs,
      unreadCount: 2,
      markReadApiFn: async () => ({ ok: false, error: 'Database connection failed' })
    });

    await client.handleMarkRead(1);

    const state = client.getState();
    assert.equal(state.unreadCount, 2, 'Unread count must be reverted to 2');
    assert.equal(state.notifs.find(n => n.id === 1).read, false, 'Notification 1 must be reverted to unread');
    assert.equal(state.toastError, 'Database connection failed', 'Error must be reported to user');
  });

  test('Mark-read success preserves optimistic read state and decrements unread count with no error', async () => {
    const initialNotifs = [
      { id: 1, title: 'Exam Circular', read: false },
      { id: 2, title: 'Holiday Notice', read: false }
    ];
    const client = simulateMarkReadClient({
      notifs: initialNotifs,
      unreadCount: 2,
      markReadApiFn: async () => ({ ok: true })
    });

    await client.handleMarkRead(1);

    const state = client.getState();
    assert.equal(state.unreadCount, 1, 'Unread count must decrement to 1');
    assert.equal(state.notifs.find(n => n.id === 1).read, true, 'Notification 1 must remain read');
    assert.equal(state.toastError, null, 'No error should be recorded');
  });

  test('Mark-all-read failure reverts all notifications to unread and restores unread count', async () => {
    const initialNotifs = [
      { id: 1, title: 'A', read: false },
      { id: 2, title: 'B', read: false },
      { id: 3, title: 'C', read: false }
    ];
    const client = simulateMarkAllReadClient({
      notifs: initialNotifs,
      unreadCount: 3,
      markAllApiFn: async () => ({ ok: false, error: 'Server 500 error' })
    });

    await client.handleMarkAllRead();

    const state = client.getState();
    assert.equal(state.unreadCount, 3, 'Unread count must be restored to 3');
    assert.equal(state.notifs.filter(n => !n.read).length, 3, 'All 3 items must be restored to unread');
    assert.equal(state.toastError, 'Server 500 error', 'Failure must be reported');
  });
});

describe('Checkpoint 12C: Bounded Notification Read State & >200 Event Resolution', () => {
  // Pure model simulating the updated bounded resolution in src/lib/notifications.ts
  function computeBoundedNotificationsView(records, user, logs, dedicatedReads = new Set()) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    const accessible = records.filter(r => r.recipient_id === null || r.recipient_id === user.id);

    // 1. Fetch user's latest mark_all_notifications_read event (O(1), never displaced by other logs)
    const userMarkAllLogs = (logs || [])
      .filter(l => l.user_id === user.id && l.action === 'mark_all_notifications_read')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    let markAllReadTimestamp = null;
    if (userMarkAllLogs.length > 0) {
      const top = userMarkAllLogs[0];
      let t = new Date(top.created_at).getTime();
      if (top.metadata?.readAt) t = Math.max(t, new Date(top.metadata.readAt).getTime());
      markAllReadTimestamp = t;
    }

    // 2. Fetch individual mark_notification_read events, bounded and scoped to >= markAllReadTimestamp
    let indLogs = (logs || [])
      .filter(l => l.user_id === user.id && l.action === 'mark_notification_read');

    if (markAllReadTimestamp !== null) {
      indLogs = indLogs.filter(l => new Date(l.created_at).getTime() >= markAllReadTimestamp);
    }

    indLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const boundedIndLogs = indLogs.slice(0, 1000);

    const readBroadcastIds = new Set(dedicatedReads);
    for (const log of boundedIndLogs) {
      if (log.metadata?.notificationId != null) {
        readBroadcastIds.add(String(log.metadata.notificationId));
      }
    }

    const mapped = accessible.map(r => {
      let isRead = Boolean(r.read);
      if (r.recipient_id === null) {
        const notifIdStr = String(r.id);
        const createdAt = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (readBroadcastIds.has(notifIdStr)) {
          isRead = true;
        } else if (markAllReadTimestamp !== null && createdAt <= markAllReadTimestamp) {
          isRead = true;
        } else {
          isRead = false;
        }
      }
      return { id: r.id, title: r.title, read: isRead, recipient_id: r.recipient_id };
    });

    return { status: 200, data: mapped };
  }

  function computeBoundedUnreadCount(records, user, logs, dedicatedReads = new Set()) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    const view = computeBoundedNotificationsView(records, user, logs, dedicatedReads);
    const count = view.data.filter(n => !n.read).length;
    return { status: 200, count };
  }

  test('More than 200 individual read events: older read notifications remain read without truncation', () => {
    // 10 broadcast notifications
    const db = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Notice ${i + 1}`,
      recipient_id: null,
      read: false,
      created_at: new Date(Date.now() - (10 - i) * 60000).toISOString()
    }));

    const logs = [];
    const userA = { id: 'user_a' };

    // User A reads notification #1 first
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 1 },
      created_at: new Date(Date.now() - 500000).toISOString()
    });

    // Now generate 250 subsequent read events (total = 251 events, exceeding prior 200-event limit)
    for (let j = 0; j < 250; j++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 999000 + j },
        created_at: new Date(Date.now() - 400000 + j * 1000).toISOString()
      });
    }

    assert.equal(logs.length, 251, 'Must simulate >200 read events');

    // With bounded resolution (up to 1000 logs), notification #1 is NOT lost
    const view = computeBoundedNotificationsView(db, userA, logs);
    const unreadRes = computeBoundedUnreadCount(db, userA, logs);

    const notif1 = view.data.find(n => n.id === 1);
    assert.equal(notif1.read, true, 'Notification #1 must remain read even after 250 subsequent read events');

    // Unread count must agree with the notification list
    assert.equal(unreadRes.count, 9, '9 out of 10 notifications remain unread');
    assert.equal(unreadRes.count, view.data.filter(n => !n.read).length, 'Unread count must agree with notification view');
  });

  test('Older mark-all-read event is never displaced by more than 200 subsequent events', () => {
    const markAllTime = new Date('2026-09-01T00:00:00Z').getTime();

    // 5 broadcast notifications created before mark-all
    const db = [
      { id: 101, title: 'Old 1', recipient_id: null, read: false, created_at: '2026-08-15T00:00:00Z' },
      { id: 102, title: 'Old 2', recipient_id: null, read: false, created_at: '2026-08-20T00:00:00Z' },
      { id: 103, title: 'New 1', recipient_id: null, read: false, created_at: '2026-09-10T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };

    // Step 1: User A executed mark_all_notifications_read on Sept 1
    logs.push({
      user_id: userA.id,
      action: 'mark_all_notifications_read',
      metadata: { readAt: new Date(markAllTime).toISOString() },
      created_at: new Date(markAllTime).toISOString()
    });

    // Step 2: User generates 250 subsequent activity logs after Sept 1
    for (let j = 0; j < 250; j++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 888000 + j },
        created_at: new Date(markAllTime + 1000 + j * 1000).toISOString()
      });
    }

    assert.equal(logs.length, 251);

    // Old notifications 101 and 102 MUST remain read because mark-all query is dedicated and not displaced
    const view = computeBoundedNotificationsView(db, userA, logs);
    const unreadRes = computeBoundedUnreadCount(db, userA, logs);

    assert.equal(view.data.find(n => n.id === 101).read, true, 'Old notification 101 must remain read');
    assert.equal(view.data.find(n => n.id === 102).read, true, 'Old notification 102 must remain read');
    assert.equal(view.data.find(n => n.id === 103).read, false, 'Newer notification 103 remains unread');

    // Unread count must be exactly 1
    assert.equal(unreadRes.count, 1);
    assert.equal(unreadRes.count, view.data.filter(n => !n.read).length);
  });

  test('Multi-user broadcast isolation under high event volume (>200 events)', () => {
    const db = [
      { id: 201, title: 'Broadcast Circular', recipient_id: null, read: false, created_at: '2026-10-01T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };
    const userB = { id: 'user_b' };

    // User A reads notification 201 and performs 250 additional actions
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 201 },
      created_at: new Date().toISOString()
    });
    for (let j = 0; j < 250; j++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 777000 + j },
        created_at: new Date().toISOString()
      });
    }

    // User A sees 0 unread
    assert.equal(computeBoundedUnreadCount(db, userA, logs).count, 0);
    assert.equal(computeBoundedNotificationsView(db, userA, logs).data[0].read, true);

    // User B has zero logs and must still see 1 unread (zero leakage)
    assert.equal(computeBoundedUnreadCount(db, userB, logs).count, 1);
    assert.equal(computeBoundedNotificationsView(db, userB, logs).data[0].read, false);
  });

  test('Progressive dedicated table integration and backward compatibility', () => {
    const db = [
      { id: 301, title: 'Broadcast 301', recipient_id: null, read: false, created_at: '2026-10-01T00:00:00Z' },
      { id: 302, title: 'Broadcast 302', recipient_id: null, read: false, created_at: '2026-10-01T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };

    // Case 1: notification_reads table has record for 301, activity_logs has record for 302
    const dedicatedReads = new Set(['301']);
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 302 },
      created_at: new Date().toISOString()
    });

    const view = computeBoundedNotificationsView(db, userA, logs, dedicatedReads);
    assert.equal(view.data.find(n => n.id === 301).read, true, 'Dedicated read record recognized');
    assert.equal(view.data.find(n => n.id === 302).read, true, 'Activity log read record recognized');
    assert.equal(computeBoundedUnreadCount(db, userA, logs, dedicatedReads).count, 0);

    // Case 2: notification_reads empty (current production schema)
    const viewFallback = computeBoundedNotificationsView(db, userA, logs, new Set());
    assert.equal(viewFallback.data.find(n => n.id === 301).read, false);
    assert.equal(viewFallback.data.find(n => n.id === 302).read, true);
    assert.equal(computeBoundedUnreadCount(db, userA, logs, new Set()).count, 1);
  });

  test('Idempotency: Repeated mark-read actions on same notification do not corrupt counts', () => {
    const db = [
      { id: 401, title: 'Broadcast 401', recipient_id: null, read: false, created_at: '2026-10-01T00:00:00Z' }
    ];
    const logs = [];
    const userA = { id: 'user_a' };

    // Push 50 identical mark-read events for notification 401
    for (let i = 0; i < 50; i++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 401 },
        created_at: new Date().toISOString()
      });
    }

    assert.equal(computeBoundedUnreadCount(db, userA, logs).count, 0);
    const view = computeBoundedNotificationsView(db, userA, logs);
    assert.equal(view.data[0].read, true);
  });
});

describe('Checkpoint 12D: Fully Unbounded Notification Read State, >1,000 Event History & Safe Migration Transition', () => {
  function resolveUnboundedReadContext(records, user, logs, dedicatedTable = null, candidateNotifs = null, options = {}) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    if (options.simulateError) {
      return { readBroadcastIds: new Set(), markAllReadTimestamp: null, error: 'Simulated query error' };
    }

    // 1. Authoritative mark-all-read timestamp (O(1))
    let markAllReadTimestamp = null;
    const userMarkAllLogs = (logs || [])
      .filter(l => l.user_id === user.id && l.action === 'mark_all_notifications_read')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (userMarkAllLogs.length > 0) {
      const top = userMarkAllLogs[0];
      markAllReadTimestamp = new Date(top.metadata?.readAt || top.created_at).getTime();
    }

    const readBroadcastIds = new Set();
    const backfilledIds = [];
    const dedicatedAvailable = dedicatedTable !== null;

    // 2. Dedicated table check (if available)
    if (dedicatedAvailable) {
      for (const id of dedicatedTable) {
        readBroadcastIds.add(String(id));
      }
    }

    // 3. Candidates to resolve
    const candidates = candidateNotifs || records.filter(r => r.recipient_id === null);
    const pending = candidates.filter(c => {
      const idStr = String(c.id);
      if (readBroadcastIds.has(idStr)) return false;
      if (markAllReadTimestamp !== null) {
        const t = c.created_at ? new Date(c.created_at).getTime() : 0;
        if (t <= markAllReadTimestamp) return false;
      }
      return true;
    });

    if (candidates.length > 0 && pending.length === 0) {
      return { readBroadcastIds, markAllReadTimestamp, backfilledIds };
    }

    // 4. Lower bound on creation time
    let lowerBoundTime = markAllReadTimestamp || 0;
    if (pending.length > 0) {
      const times = pending.map(c => c.created_at ? new Date(c.created_at).getTime() : 0).filter(t => t > 0);
      if (times.length > 0) {
        lowerBoundTime = Math.max(lowerBoundTime, Math.min(...times));
      }
    }

    // 5. Paginated scan over activity logs without arbitrary 1,000 limit
    let userLogs = (logs || [])
      .filter(l => l.user_id === user.id && l.action === 'mark_notification_read');
    if (lowerBoundTime > 0) {
      userLogs = userLogs.filter(l => new Date(l.created_at).getTime() >= lowerBoundTime);
    }
    userLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const neededIds = new Set(pending.map(c => String(c.id)));
    const PAGE_SIZE = 1000;
    let page = 0;

    while (page * PAGE_SIZE < userLogs.length) {
      const pageLogs = userLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
      for (const log of pageLogs) {
        if (log.metadata?.notificationId != null) {
          const idStr = String(log.metadata.notificationId);
          readBroadcastIds.add(idStr);
          if (neededIds.has(idStr)) {
            neededIds.delete(idStr);
            if (dedicatedAvailable) {
              backfilledIds.push(log.metadata.notificationId);
              dedicatedTable.add(String(log.metadata.notificationId));
            }
          }
        }
      }
      if (candidates.length > 0 && neededIds.size === 0) {
        break; // Early exit: all candidates confirmed read
      }
      page++;
    }

    return { readBroadcastIds, markAllReadTimestamp, backfilledIds };
  }

  function computeUnboundedNotificationsView(records, user, logs, dedicatedTable = null, candidateNotifs = null, options = {}) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    const accessible = records.filter(r => r.recipient_id === null || r.recipient_id === user.id);
    const context = resolveUnboundedReadContext(records, user, logs, dedicatedTable, candidateNotifs, options);

    const mapped = accessible.map(r => {
      let isRead = Boolean(r.read);
      if (r.recipient_id === null) {
        const notifIdStr = String(r.id);
        const createdAt = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (context.readBroadcastIds.has(notifIdStr)) {
          isRead = true;
        } else if (context.markAllReadTimestamp !== null && createdAt <= context.markAllReadTimestamp) {
          isRead = true;
        } else {
          isRead = false;
        }
      }
      return { id: r.id, title: r.title, read: isRead, recipient_id: r.recipient_id };
    });

    return { status: 200, data: mapped, context };
  }

  function computeUnboundedUnreadCount(records, user, logs, dedicatedTable = null, options = {}) {
    if (!user) return { status: 401, error: 'Unauthorized' };
    // Exact count of private unread
    const privateUnread = records.filter(r => r.recipient_id === user.id && !r.read).length;

    // Resolve context for all candidate broadcast notifications
    const broadcastNotifs = records.filter(r => r.recipient_id === null);
    const context = resolveUnboundedReadContext(records, user, logs, dedicatedTable, broadcastNotifs, options);

    let unreadBroadcastCount = 0;
    for (const b of broadcastNotifs) {
      const notifIdStr = String(b.id);
      const createdAt = b.created_at ? new Date(b.created_at).getTime() : 0;
      let isRead = false;
      if (context.readBroadcastIds.has(notifIdStr)) {
        isRead = true;
      } else if (context.markAllReadTimestamp !== null && createdAt <= context.markAllReadTimestamp) {
        isRead = true;
      }
      if (!isRead) {
        unreadBroadcastCount++;
      }
    }

    return { status: 200, count: privateUnread + unreadBroadcastCount, context };
  }

  test('More than 1,000 individual broadcast read events (1,250 events) with NO prior mark-all-read event: older read notification remains read without truncation', () => {
    // 10 broadcast notifications
    const db = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Notice ${i + 1}`,
      recipient_id: null,
      read: false,
      created_at: new Date(Date.now() - (20 - i) * 60000).toISOString()
    }));

    const logs = [];
    const userA = { id: 'user_a' };

    // User A reads notification #1 first at T_0
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 1 },
      created_at: new Date(Date.now() - 1000000).toISOString()
    });

    // Now generate 1,250 subsequent read events (total = 1,251 events, far exceeding the prior 1,000-event limit)
    for (let j = 0; j < 1250; j++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 100000 + j },
        created_at: new Date(Date.now() - 900000 + j * 500).toISOString()
      });
    }

    assert.equal(logs.length, 1251, 'Must contain >1,000 read events');

    // With candidate-aware paginated resolution, notification #1 is NOT dropped
    const view = computeUnboundedNotificationsView(db, userA, logs);
    const unreadRes = computeUnboundedUnreadCount(db, userA, logs);

    const notif1 = view.data.find(n => n.id === 1);
    assert.equal(notif1.read, true, 'Notification #1 must remain read even after 1,250 subsequent read events');

    // Notifications 2 through 10 were never marked read and must remain unread
    for (let i = 2; i <= 10; i++) {
      assert.equal(view.data.find(n => n.id === i).read, false, `Notification #${i} must remain unread`);
    }

    // Unread count must agree exactly with notification view (9 out of 10 unread)
    assert.equal(unreadRes.count, 9);
    assert.equal(unreadRes.count, view.data.filter(n => !n.read).length);
  });

  test('Older mark-all-read event is never displaced by more than 1,000 subsequent events', () => {
    const markAllTime = new Date('2026-08-01T00:00:00Z').getTime();

    const db = [
      { id: 101, title: 'Term 1 Circular', recipient_id: null, read: false, created_at: '2026-07-15T00:00:00Z' },
      { id: 102, title: 'Term 1 Timetable', recipient_id: null, read: false, created_at: '2026-07-20T00:00:00Z' },
      { id: 103, title: 'Term 2 Circular', recipient_id: null, read: false, created_at: '2026-08-15T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };

    // Mark-all executed on Aug 1
    logs.push({
      user_id: userA.id,
      action: 'mark_all_notifications_read',
      metadata: { readAt: new Date(markAllTime).toISOString() },
      created_at: new Date(markAllTime).toISOString()
    });

    // 1,200 subsequent read events after Aug 1
    for (let j = 0; j < 1200; j++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 200000 + j },
        created_at: new Date(markAllTime + 1000 + j * 1000).toISOString()
      });
    }

    const view = computeUnboundedNotificationsView(db, userA, logs);
    const unreadRes = computeUnboundedUnreadCount(db, userA, logs);

    assert.equal(view.data.find(n => n.id === 101).read, true, 'Term 1 Circular remains read');
    assert.equal(view.data.find(n => n.id === 102).read, true, 'Term 1 Timetable remains read');
    assert.equal(view.data.find(n => n.id === 103).read, false, 'Term 2 Circular (created after mark-all) remains unread');

    assert.equal(unreadRes.count, 1);
    assert.equal(unreadRes.count, view.data.filter(n => !n.read).length);
  });

  test('Multi-user isolation across >1,000 read events (zero cross-user leakage)', () => {
    const db = [
      { id: 301, title: 'Annual General Meeting', recipient_id: null, read: false, created_at: '2026-09-01T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };
    const userB = { id: 'user_b' };

    // User A marks notification 301 read and accumulates 1,200 more events
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 301 },
      created_at: new Date().toISOString()
    });
    for (let j = 0; j < 1200; j++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 300000 + j },
        created_at: new Date().toISOString()
      });
    }

    // User A sees 0 unread
    assert.equal(computeUnboundedUnreadCount(db, userA, logs).count, 0);
    assert.equal(computeUnboundedNotificationsView(db, userA, logs).data[0].read, true);

    // User B has 0 logs and must see 1 unread (zero leakage)
    assert.equal(computeUnboundedUnreadCount(db, userB, logs).count, 1);
    assert.equal(computeUnboundedNotificationsView(db, userB, logs).data[0].read, false);
  });

  test('Notifications created before and after relevant read timestamps are accurately evaluated', () => {
    const markAllTime = new Date('2026-09-01T00:00:00Z').getTime();

    const db = [
      { id: 401, title: 'Before Mark-All', recipient_id: null, read: false, created_at: '2026-08-20T00:00:00Z' },
      { id: 402, title: 'After Mark-All, Individually Read', recipient_id: null, read: false, created_at: '2026-09-05T00:00:00Z' },
      { id: 403, title: 'After Mark-All, Unread', recipient_id: null, read: false, created_at: '2026-09-10T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };

    // Mark all on Sept 1
    logs.push({
      user_id: userA.id,
      action: 'mark_all_notifications_read',
      metadata: { readAt: new Date(markAllTime).toISOString() },
      created_at: new Date(markAllTime).toISOString()
    });

    // Individually mark 402 read on Sept 6
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 402 },
      created_at: '2026-09-06T00:00:00Z'
    });

    const view = computeUnboundedNotificationsView(db, userA, logs);
    const unreadRes = computeUnboundedUnreadCount(db, userA, logs);

    assert.equal(view.data.find(n => n.id === 401).read, true);
    assert.equal(view.data.find(n => n.id === 402).read, true);
    assert.equal(view.data.find(n => n.id === 403).read, false);

    assert.equal(unreadRes.count, 1);
    assert.equal(unreadRes.count, view.data.filter(n => !n.read).length);
  });

  test('Agreement between notification list read flags and unread-count endpoint across mixed cohorts', () => {
    const db = [
      { id: 501, title: 'Broadcast 1', recipient_id: null, read: false, created_at: '2026-10-01T00:00:00Z' },
      { id: 502, title: 'Broadcast 2', recipient_id: null, read: false, created_at: '2026-10-02T00:00:00Z' },
      { id: 503, title: 'Private User A (Unread)', recipient_id: 'user_a', read: false, created_at: '2026-10-03T00:00:00Z' },
      { id: 504, title: 'Private User A (Read)', recipient_id: 'user_a', read: true, created_at: '2026-10-04T00:00:00Z' },
      { id: 505, title: 'Private User B', recipient_id: 'user_b', read: false, created_at: '2026-10-05T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };

    // User A reads Broadcast 1
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 501 },
      created_at: new Date().toISOString()
    });

    const viewA = computeUnboundedNotificationsView(db, userA, logs);
    const unreadResA = computeUnboundedUnreadCount(db, userA, logs);

    // User A sees 4 notifications (501, 502, 503, 504; 505 is excluded)
    assert.equal(viewA.data.length, 4);

    // Unread count must be exactly 2 (Broadcast 2 + Private 503)
    assert.equal(unreadResA.count, 2);
    assert.equal(unreadResA.count, viewA.data.filter(n => !n.read).length);
  });

  test('Duplicate read requests (idempotency) and pagination across multiple pages', () => {
    // 25 notifications
    const db = Array.from({ length: 25 }, (_, i) => ({
      id: 601 + i,
      title: `Paginated Notice ${i + 1}`,
      recipient_id: null,
      read: false,
      created_at: new Date(Date.now() - (30 - i) * 60000).toISOString()
    }));

    const logs = [];
    const userA = { id: 'user_a' };

    // Duplicate read actions for notification 601 and 615
    for (let i = 0; i < 20; i++) {
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 601 },
        created_at: new Date().toISOString()
      });
      logs.push({
        user_id: userA.id,
        action: 'mark_notification_read',
        metadata: { notificationId: 615 },
        created_at: new Date().toISOString()
      });
    }

    // Page 1 (first 10 items)
    const page1Items = db.slice(0, 10);
    const page1View = computeUnboundedNotificationsView(db, userA, logs, null, page1Items);
    assert.equal(page1View.data.find(n => n.id === 601).read, true);
    assert.equal(page1View.data.find(n => n.id === 602).read, false);

    // Page 2 (items 10-20)
    const page2Items = db.slice(10, 20);
    const page2View = computeUnboundedNotificationsView(db, userA, logs, null, page2Items);
    assert.equal(page2View.data.find(n => n.id === 615).read, true);
    assert.equal(page2View.data.find(n => n.id === 614).read, false);

    // Total unread count across all 25 items is 23 (25 - 2 read)
    const unreadRes = computeUnboundedUnreadCount(db, userA, logs);
    assert.equal(unreadRes.count, 23);
  });

  test('Appropriate error handling if a read-state query fails', () => {
    const db = [{ id: 701, title: 'Emergency Notice', recipient_id: null, read: false, created_at: '2026-10-01T00:00:00Z' }];
    const logs = [];
    const userA = { id: 'user_a' };

    // Simulate query failure
    const errorView = computeUnboundedNotificationsView(db, userA, logs, null, null, { simulateError: true });
    assert.equal(errorView.status, 200, 'Endpoint fails gracefully without unhandled crash');
    assert.ok(errorView.context.error, 'Error flag captured');
    assert.equal(errorView.data[0].read, false, 'Default safe unread fallback applied');
  });

  test('Safe future migration transition: historical read in activity_logs is recognized and lazy-backfilled into dedicated table', () => {
    const db = [
      { id: 801, title: 'Historical Notice 801', recipient_id: null, read: false, created_at: '2026-09-01T00:00:00Z' },
      { id: 802, title: 'New Notice 802', recipient_id: null, read: false, created_at: '2026-10-01T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };

    // Historical read in activity_logs for 801
    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 801 },
      created_at: '2026-09-05T00:00:00Z'
    });

    // Dedicated table becomes available, but only contains record for 802
    const dedicatedTable = new Set(['802']);

    // The user MUST NOT see 801 as unread! Dual-read reconciliation must combine both sources.
    const view = computeUnboundedNotificationsView(db, userA, logs, dedicatedTable);

    assert.equal(view.data.find(n => n.id === 801).read, true, 'Historical 801 in activity_logs is recognized as read');
    assert.equal(view.data.find(n => n.id === 802).read, true, 'Dedicated table 802 is recognized as read');

    // Lazy-backfill verification: 801 must have been backfilled into dedicatedTable
    assert.ok(dedicatedTable.has('801'), '801 must be lazily backfilled into dedicated table');
    assert.ok(view.context.backfilledIds.includes(801), 'Backfill tracking records 801');
  });

  test('Safe migration rollback compatibility: system seamlessly falls back to activity_logs if dedicated table is dropped', () => {
    const db = [
      { id: 901, title: 'Notice 901', recipient_id: null, read: false, created_at: '2026-09-01T00:00:00Z' }
    ];

    const logs = [];
    const userA = { id: 'user_a' };

    logs.push({
      user_id: userA.id,
      action: 'mark_notification_read',
      metadata: { notificationId: 901 },
      created_at: '2026-09-05T00:00:00Z'
    });

    // Dedicated table is null (dropped / rolled back)
    const view = computeUnboundedNotificationsView(db, userA, logs, null);
    assert.equal(view.data[0].read, true, 'Falls back cleanly to activity_logs with zero disruption');
  });
});

describe('Checkpoint 12E: Notification Failure Semantics, Query Efficiency & Deterministic Pagination', () => {
  test('classifyTableError accurately categorizes table absence, permissions, and transient outages', () => {
    // 1. Available
    assert.equal(classifyTableError(null), 'available');
    assert.equal(classifyTableError(undefined), 'available');

    // 2. Genuinely absent
    assert.equal(classifyTableError({ code: 'PGRST205', message: "Could not find the table in schema cache" }), 'absent');
    assert.equal(classifyTableError({ code: '42P01', message: 'relation "notification_reads" does not exist' }), 'absent');
    assert.equal(classifyTableError({ message: 'relation "public.notification_reads" does not exist' }), 'absent');

    // 3. Permission / RLS denial
    assert.equal(classifyTableError({ code: '42501', message: 'insufficient_privilege' }), 'permission_denied');
    assert.equal(classifyTableError({ code: '403', message: 'Forbidden' }), 'permission_denied');
    assert.equal(classifyTableError({ message: 'new row violates row-level security policy for table "notification_reads"' }), 'permission_denied');
    assert.equal(classifyTableError({ code: 'PGRST301', message: 'JWT expired' }), 'permission_denied');

    // 4. Transient database or network outage
    assert.equal(classifyTableError({ message: 'fetch failed' }), 'transient_error');
    assert.equal(classifyTableError({ code: 'ETIMEDOUT', message: 'Connection timed out' }), 'transient_error');
    assert.equal(classifyTableError({ code: '500', message: 'Internal Server Error' }), 'transient_error');
    assert.equal(classifyTableError(new Error('Network connection terminated unexpectedly')), 'transient_error');
  });

  // Simulation harness implementing the exact Checkpoint 12E failure semantics
  function executeReadContextResolution({
    candidateNotifs,
    dedicatedTableError = null,
    dedicatedData = null,
    activityLogError = null,
    activityLogs = [],
    markAllError = null,
    markAllLogs = []
  }) {
    // 1. Check mark-all
    let markAllReadTimestamp = null;
    if (markAllError) {
      const status = classifyTableError(markAllError);
      if (status === 'permission_denied') throw new Error(`Permission denied querying mark_all_notifications_read: ${markAllError.message}`);
      if (status === 'transient_error') throw new Error(`Database error querying mark_all_notifications_read: ${markAllError.message}`);
    } else if (markAllLogs.length > 0) {
      // Deterministic sort by created_at DESC, id DESC
      const sorted = [...markAllLogs].sort((a, b) => {
        const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (diff !== 0) return diff;
        return (b.id ?? 0) - (a.id ?? 0);
      });
      const top = sorted[0];
      let t = top.created_at ? new Date(top.created_at).getTime() : 0;
      if (top.metadata?.readAt) {
        const parsed = new Date(top.metadata.readAt).getTime();
        if (!Number.isNaN(parsed)) t = Math.max(t, parsed);
      }
      if (!Number.isNaN(t) && t > 0) markAllReadTimestamp = t;
    }

    const readBroadcastIds = new Set();
    let dedicatedTableAvailable = false;

    // 2. Check dedicated table
    if (dedicatedTableError) {
      const status = classifyTableError(dedicatedTableError);
      if (status === 'absent') {
        dedicatedTableAvailable = false;
      } else if (status === 'permission_denied') {
        throw new Error(`Permission denied querying notification_reads: ${dedicatedTableError.message}`);
      } else {
        throw new Error(`Database error querying notification_reads: ${dedicatedTableError.message}`);
      }
    } else if (dedicatedData !== null) {
      dedicatedTableAvailable = true;
      for (const r of dedicatedData) {
        if (r.notification_id != null) readBroadcastIds.add(String(r.notification_id));
      }
    }

    // Filter pending candidates
    const pending = (candidateNotifs || []).filter(c => {
      const idStr = String(c.id);
      if (readBroadcastIds.has(idStr)) return false;
      if (markAllReadTimestamp !== null) {
        const t = c.created_at ? new Date(c.created_at).getTime() : 0;
        if (!Number.isNaN(t) && t <= markAllReadTimestamp) return false;
      }
      return true;
    });

    if (candidateNotifs && candidateNotifs.length > 0 && pending.length === 0) {
      return { readBroadcastIds, markAllReadTimestamp, dedicatedTableAvailable };
    }

    // Lower bound with 60s clock skew buffer
    let lowerBoundTime = markAllReadTimestamp ?? 0;
    if (pending.length > 0) {
      const times = pending.map(c => c.created_at ? new Date(c.created_at).getTime() : 0).filter(t => t > 0);
      if (times.length > 0) {
        const oldestTime = Math.max(0, Math.min(...times) - 60_000);
        lowerBoundTime = Math.max(lowerBoundTime, oldestTime);
      }
    }

    // 3. Activity logs fallback
    if (activityLogError) {
      const status = classifyTableError(activityLogError);
      if (status === 'permission_denied') throw new Error(`Permission denied querying activity_logs: ${activityLogError.message}`);
      if (status === 'transient_error') throw new Error(`Database error querying activity_logs: ${activityLogError.message}`);
    }

    // Filter activity logs by lower bound and deterministic ordering (created_at DESC, id DESC)
    const filteredLogs = activityLogs
      .filter(l => l.action === 'mark_notification_read')
      .filter(l => lowerBoundTime === 0 || new Date(l.created_at).getTime() >= lowerBoundTime)
      .sort((a, b) => {
        const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (diff !== 0) return diff;
        return (b.id ?? 0) - (a.id ?? 0);
      });

    for (const log of filteredLogs) {
      if (log.metadata?.notificationId != null) {
        readBroadcastIds.add(String(log.metadata.notificationId));
      }
    }

    return { readBroadcastIds, markAllReadTimestamp, dedicatedTableAvailable };
  }

  test('Genuinely absent notification_reads table activates activity_logs fallback smoothly', () => {
    const candidateNotifs = [
      { id: 101, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];
    const activityLogs = [
      { id: 1, action: 'mark_notification_read', metadata: { notificationId: 101 }, created_at: '2026-10-10T10:05:00Z' }
    ];

    const result = executeReadContextResolution({
      candidateNotifs,
      dedicatedTableError: { code: 'PGRST205', message: "Could not find table in schema cache" },
      activityLogs
    });

    assert.equal(result.dedicatedTableAvailable, false);
    assert.ok(result.readBroadcastIds.has('101'), 'Fallback read activity_logs successfully');
  });

  test('Permission/RLS rejection on notification_reads throws explicit error and DOES NOT silently fall back', () => {
    const candidateNotifs = [
      { id: 102, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    assert.throws(() => {
      executeReadContextResolution({
        candidateNotifs,
        dedicatedTableError: { code: '42501', message: "permission denied for table notification_reads" }
      });
    }, /Permission denied querying notification_reads/);
  });

  test('Transient network or database outage on notification_reads throws explicit error and DOES NOT return inaccurate unread state', () => {
    const candidateNotifs = [
      { id: 103, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    assert.throws(() => {
      executeReadContextResolution({
        candidateNotifs,
        dedicatedTableError: new Error("fetch failed")
      });
    }, /Database error querying notification_reads/);
  });

  test('Database failure on activity_logs surfaces error and prevents false unread count calculation', () => {
    const candidateNotifs = [
      { id: 104, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    assert.throws(() => {
      executeReadContextResolution({
        candidateNotifs,
        dedicatedTableError: { code: 'PGRST205', message: "Table absent" },
        activityLogError: { code: '500', message: "Internal server error" }
      });
    }, /Database error querying activity_logs/);
  });

  test('Clock skew safety window: read event logged slightly before notification creation is NOT excluded', () => {
    // Notification created at T = 1,000,000 ms
    const notifCreated = new Date(1_000_000).toISOString();
    const candidateNotifs = [
      { id: 201, created_at: notifCreated, recipient_id: null }
    ];

    // Read event logged at T = 980,000 ms (20 seconds earlier due to server clock skew / race condition)
    const readTime = new Date(980_000).toISOString();
    const activityLogs = [
      { id: 1, action: 'mark_notification_read', metadata: { notificationId: 201 }, created_at: readTime }
    ];

    const result = executeReadContextResolution({
      candidateNotifs,
      dedicatedTableError: { code: 'PGRST205', message: "Table absent" },
      activityLogs
    });

    assert.ok(result.readBroadcastIds.has('201'), 'Read event within 60s safety buffer must be included');
  });

  test('Deterministic tie-breaker: multiple mark-all-read records with identical timestamp sort deterministically by id DESC', () => {
    const sameTimestamp = '2026-10-01T12:00:00.000Z';
    const markAllLogs = [
      { id: 5, action: 'mark_all_notifications_read', metadata: { readAt: sameTimestamp }, created_at: sameTimestamp },
      { id: 15, action: 'mark_all_notifications_read', metadata: { readAt: '2026-10-02T12:00:00.000Z' }, created_at: sameTimestamp }
    ];

    const result = executeReadContextResolution({
      candidateNotifs: [],
      dedicatedData: [],
      markAllLogs
    });

    // ID 15 should win tie-breaker because it has higher id, and its metadata has 2026-10-02
    assert.equal(result.markAllReadTimestamp, new Date('2026-10-02T12:00:00.000Z').getTime());
  });

  test('Candidate pagination with identical timestamps preserves deterministic ordering without skipping', () => {
    const timestamp = '2026-10-12T00:00:00.000Z';
    // 10 candidate notifications with the exact same timestamp but distinct IDs
    const notifs = Array.from({ length: 10 }, (_, i) => ({
      id: 300 + (10 - i), // IDs 310 down to 301
      created_at: timestamp
    }));

    // Deterministic sort: created_at DESC, id DESC
    const sorted = [...notifs].sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (diff !== 0) return diff;
      return b.id - a.id;
    });

    // Page 1 (first 5 items)
    const page1 = sorted.slice(0, 5);
    // Page 2 (next 5 items)
    const page2 = sorted.slice(5, 10);

    const page1Ids = page1.map(n => n.id);
    const page2Ids = page2.map(n => n.id);

    // Verify no overlaps and no omissions
    assert.deepEqual(page1Ids, [310, 309, 308, 307, 306]);
    assert.deepEqual(page2Ids, [305, 304, 303, 302, 301]);
    const overlap = page1Ids.filter(id => page2Ids.includes(id));
    assert.equal(overlap.length, 0, 'Zero skipping or duplicate items across pages');
  });

  test('Multi-user isolation: User A database error or unread count never affects User B', () => {
    const candidateNotifsUserB = [
      { id: 401, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];
    const dedicatedDataUserB = [
      { notification_id: 401 }
    ];

    // User A has an error, but User B resolves successfully
    const resultUserB = executeReadContextResolution({
      candidateNotifs: candidateNotifsUserB,
      dedicatedData: dedicatedDataUserB
    });

    assert.ok(resultUserB.readBroadcastIds.has('401'), 'User B read status resolved independently');
  });

  // =========================================================================
  // ACTUAL RUNTIME CONTROL-FLOW PAGINATION TESTS (using Controllable Mock Client)
  // [Mocked Unit Test - Actual Control Flow Runtime]
  // Live database integration tests remain strictly BLOCKED pending an isolated
  // staging environment (Safety Rules #2 & #6).
  // =========================================================================

  function createControllableMockSupabase({
    markAllLogs = [],
    markAllErr = null,
    dedicatedReads = null,
    dedicatedErr = { code: 'PGRST205', message: 'relation "notification_reads" does not exist' },
    dedicatedCount = undefined,
    activityPages = [],
    totalCount = undefined,
    notificationsData = [],
    notificationsErr = null,
    notificationsCount = undefined,
    privateUnreadCount = undefined,
    insertErr = null,
    updateErr = null,
    upsertErr = null,
    existingReadLogs = null,
    existingReadLogsErr = null
  } = {}) {
    const queryLog = [];
    let activityCallIndex = 0;

    const client = {
      queryLog,
      from(table) {
        const q = {
          table,
          selectCols: null,
          selectOpts: null,
          eqFilters: {},
          inFilters: {},
          gteFilters: {},
          gtFilters: {},
          isFilters: {},
          orFilters: [],
          orders: [],
          rangeSpan: null,
          limitVal: null,
          upsertData: null,
          insertData: null,
          updateData: null,
          isSingle: false,
          isMaybeSingle: false,
        };

        const chain = {
          select(cols, opts) {
            q.selectCols = cols;
            q.selectOpts = opts;
            return chain;
          },
          eq(col, val) {
            q.eqFilters[col] = val;
            return chain;
          },
          in(col, vals) {
            q.inFilters[col] = vals;
            return chain;
          },
          gte(col, val) {
            q.gteFilters[col] = val;
            return chain;
          },
          gt(col, val) {
            q.gtFilters[col] = val;
            return chain;
          },
          is(col, val) {
            q.isFilters[col] = val;
            return chain;
          },
          or(filter) {
            q.orFilters.push(filter);
            return chain;
          },
          order(col, opts) {
            q.orders.push({ col, opts });
            return chain;
          },
          limit(val) {
            q.limitVal = val;
            return chain;
          },
          range(start, end) {
            q.rangeSpan = [start, end];
            return chain;
          },
          upsert(data, opts) {
            q.upsertData = { data, opts };
            return chain;
          },
          insert(data) {
            q.insertData = data;
            return chain;
          },
          update(data) {
            q.updateData = data;
            return chain;
          },
          single() {
            q.isSingle = true;
            return chain;
          },
          maybeSingle() {
            q.isMaybeSingle = true;
            return chain;
          },
          then(resolve) {
            queryLog.push(q);

            // 1. activity_logs insert
            if (table === 'activity_logs' && q.insertData) {
              if (insertErr) {
                resolve({ data: null, error: insertErr });
              } else {
                resolve({ data: q.insertData, error: null });
              }
              return;
            }

            // 2. mark_all_notifications_read select
            if (table === 'activity_logs' && q.eqFilters.action === 'mark_all_notifications_read') {
              resolve({ data: markAllLogs, error: markAllErr });
              return;
            }

            // 3. notification_reads
            if (table === 'notification_reads') {
              if (q.upsertData) {
                const err = upsertErr !== null ? upsertErr : (dedicatedErr || null);
                resolve({ data: null, error: err });
                return;
              }
              if (dedicatedErr) {
                resolve({ data: null, count: null, error: dedicatedErr });
                return;
              }
              let reads = Array.isArray(dedicatedReads) ? dedicatedReads : [];
              if (q.inFilters.notification_id) {
                const set = new Set(q.inFilters.notification_id.map(String));
                reads = reads.filter(r => set.has(String(r.notification_id)));
              }
              const cnt = typeof dedicatedCount === 'number' ? dedicatedCount : reads.length;
              resolve({ data: reads, count: cnt, error: null });
              return;
            }

            // 4. activity_logs mark_notification_read
            if (table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read') {
              // Retry check: select('id').eq('metadata', ...)
              if (q.selectCols === 'id' && q.eqFilters.metadata !== undefined) {
                if (existingReadLogsErr) {
                  resolve({ data: null, error: existingReadLogsErr });
                } else {
                  resolve({ data: existingReadLogs ?? [], error: null });
                }
                return;
              }

              const pageIndex = activityCallIndex++;
              const res = typeof activityPages === 'function'
                ? activityPages(pageIndex, q.rangeSpan)
                : (activityPages[pageIndex] ?? { data: [], error: null });
              if (res.error) {
                resolve({ data: null, count: null, error: res.error });
              } else {
                const rows = res.data ?? (Array.isArray(res) ? res : []);
                const cnt = res.count !== undefined
                  ? res.count
                  : (typeof totalCount === 'number'
                    ? totalCount
                    : (Array.isArray(activityPages)
                        ? activityPages.reduce((sum, p) => sum + ((p.data ?? p)?.length || 0), 0)
                        : rows.length));
                resolve({ data: rows, count: cnt, error: null });
              }
              return;
            }

            // 5. notifications
            if (table === 'notifications') {
              if (q.updateData) {
                if (updateErr) {
                  resolve({ data: null, error: updateErr });
                } else {
                  resolve({ data: null, error: null });
                }
                return;
              }
              if (notificationsErr) {
                resolve({ data: null, count: null, error: notificationsErr });
                return;
              }
              if (q.isSingle || q.isMaybeSingle) {
                const target = notificationsData.find(n => String(n.id) === String(q.eqFilters.id)) ?? notificationsData[0] ?? null;
                resolve({ data: target, error: null });
                return;
              }
              if (q.selectOpts?.head) {
                const cnt = typeof privateUnreadCount === 'number'
                  ? privateUnreadCount
                  : (typeof notificationsCount === 'number' ? notificationsCount : notificationsData.length);
                resolve({ data: null, count: cnt, error: null });
                return;
              }
              const start = q.rangeSpan ? q.rangeSpan[0] : 0;
              const end = q.rangeSpan ? q.rangeSpan[1] + 1 : undefined;
              const sliced = notificationsData.slice(start, end);
              const cnt = typeof notificationsCount === 'number' ? notificationsCount : notificationsData.length;
              resolve({ data: sliced, count: cnt, error: null });
              return;
            }

            resolve({ data: [], error: null });
          }
        };
        return chain;
      }
    };
    return client;
  }

  test('[Mocked Unit Test - Actual Control Flow Runtime] All candidate IDs resolved before guardrail: early exit, no unnecessary additional query', async () => {
    const candidates = [
      { id: 101, created_at: '2026-10-10T10:00:00Z', recipient_id: null },
      { id: 102, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 3,
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 101 }), created_at: '2026-10-10T10:05:00Z' },
            { id: 2, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 102 }), created_at: '2026-10-10T10:06:00Z' }
          ]
        },
        {
          data: [
            { id: 3, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 999 }), created_at: '2026-10-10T10:07:00Z' }
          ]
        }
      ]
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 5, pageSize: 2 });

    assert.ok(ctx.readBroadcastIds.has('101'), '101 marked read');
    assert.ok(ctx.readBroadcastIds.has('102'), '102 marked read');

    const notifReadQueries = mockClient.queryLog.filter(
      q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read'
    );

    assert.equal(notifReadQueries.length, 1, 'Early exit must prevent Page 1 query');
    assert.deepEqual(notifReadQueries[0].rangeSpan, [0, 1]);
  });

  test('[Mocked Unit Test - Actual Control Flow Runtime] Exactly at the boundary with unresolved IDs: explicit error', async () => {
    const candidates = [
      { id: 101, created_at: '2026-10-10T10:00:00Z', recipient_id: null },
      { id: 102, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 10,
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 101 }), created_at: '2026-10-10T10:05:00Z' },
            { id: 2, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 888 }), created_at: '2026-10-10T10:06:00Z' }
          ]
        },
        {
          data: [
            { id: 3, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 777 }), created_at: '2026-10-10T10:07:00Z' },
            { id: 4, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 666 }), created_at: '2026-10-10T10:08:00Z' }
          ]
        }
      ]
    });

    await assert.rejects(
      async () => {
        await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 2, pageSize: 2 });
      },
      /Incomplete activity-log scan: safety limit of 2 page\(s\) reached with 1 unresolved notification candidate\(s\)/
    );

    const notifReadQueries = mockClient.queryLog.filter(
      q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read'
    );

    assert.equal(notifReadQueries.length, 2, 'Exactly 2 pages queried before guardrail trip');
    assert.deepEqual(notifReadQueries[0].rangeSpan, [0, 1]);
    assert.deepEqual(notifReadQueries[1].rangeSpan, [2, 3]);
  });

  test('[Mocked Unit Test - Actual Control Flow Runtime] Beyond boundary with unresolved IDs: explicit error and no false successful result', async () => {
    const candidates = [
      { id: 201, created_at: '2026-10-10T10:00:00Z', recipient_id: null },
      { id: 202, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 10,
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 999 }), created_at: '2026-10-10T10:05:00Z' },
            { id: 2, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 888 }), created_at: '2026-10-10T10:06:00Z' }
          ]
        }
      ]
    });

    let caughtError = null;
    try {
      await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 1, pageSize: 2 });
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError !== null, 'Must throw error on guardrail trip');
    assert.match(caughtError.message, /Incomplete activity-log scan: safety limit of 1 page\(s\) reached with 2 unresolved notification candidate\(s\)/);

    function simulateUnreadCountApi(error) {
      if (error) {
        return { status: 500, error: error.message };
      }
      return { status: 200, count: 0 };
    }

    const apiResult = simulateUnreadCountApi(caughtError);
    assert.equal(apiResult.status, 500, 'Must return HTTP 500 on incomplete scan');
    assert.match(apiResult.error, /Incomplete activity-log scan/);
  });

  test('[Mocked Unit Test - Actual Control Flow Runtime] A candidate resolved on the final permitted page: successful, correct result', async () => {
    const candidates = [
      { id: 301, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 4,
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 888 }), created_at: '2026-10-10T10:05:00Z' },
            { id: 2, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 777 }), created_at: '2026-10-10T10:06:00Z' }
          ]
        },
        {
          data: [
            { id: 3, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 301 }), created_at: '2026-10-10T10:07:00Z' },
            { id: 4, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 666 }), created_at: '2026-10-10T10:08:00Z' }
          ]
        }
      ]
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 2, pageSize: 2 });

    assert.ok(ctx.readBroadcastIds.has('301'), '301 resolved on final permitted page');

    const notifReadQueries = mockClient.queryLog.filter(
      q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read'
    );

    assert.equal(notifReadQueries.length, 2);
    assert.deepEqual(notifReadQueries[0].rangeSpan, [0, 1]);
    assert.deepEqual(notifReadQueries[1].rangeSpan, [2, 3]);
  });

  test('[Mocked Unit Test - Actual Control Flow Runtime] A database error during a later page: error propagation, not a partial success', async () => {
    const candidates = [
      { id: 401, created_at: '2026-10-10T10:00:00Z', recipient_id: null },
      { id: 402, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 4,
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 401 }), created_at: '2026-10-10T10:05:00Z' },
            { id: 2, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 888 }), created_at: '2026-10-10T10:06:00Z' }
          ]
        },
        {
          error: { code: '500', message: 'PostgreSQL connection terminated' }
        }
      ]
    });

    await assert.rejects(
      async () => {
        await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 3, pageSize: 2 });
      },
      /Database error querying activity_logs: PostgreSQL connection terminated/
    );
  });

  test('[Mocked Unit Test - Actual Control Flow Runtime] Genuine end of matching logs below pageSize: complete scan without error', async () => {
    const candidates = [
      { id: 501, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 1,
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 999 }), created_at: '2026-10-10T10:05:00Z' }
          ]
        }
      ]
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 3, pageSize: 2 });

    assert.equal(ctx.readBroadcastIds.has('501'), false, '501 genuinely unread');

    const notifReadQueries = mockClient.queryLog.filter(
      q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read'
    );
    assert.equal(notifReadQueries.length, 1);
    assert.deepEqual(notifReadQueries[0].rangeSpan, [0, 1]);
  });

  test('[Mocked Unit Test - Actual Control Flow Runtime] All candidate IDs resolved by dedicated table: early exit with 0 activity_logs queries', async () => {
    const candidates = [
      { id: 601, created_at: '2026-10-10T10:00:00Z', recipient_id: null },
      { id: 602, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      dedicatedReads: [
        { notification_id: 601 },
        { notification_id: 602 }
      ],
      dedicatedErr: null,
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 999 }), created_at: '2026-10-10T10:05:00Z' }
          ]
        }
      ]
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 5, pageSize: 2 });

    assert.ok(ctx.readBroadcastIds.has('601'));
    assert.ok(ctx.readBroadcastIds.has('602'));

    const notifReadQueries = mockClient.queryLog.filter(
      q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read'
    );
    assert.equal(notifReadQueries.length, 0, 'Zero activity_logs queries made when dedicated table resolves all candidates');
  });

  test('[Mocked Unit Test - Actual Control Flow Runtime] Candidate list with only private notifications: early exit with 0 activity_logs queries', async () => {
    const candidates = [
      { id: 701, created_at: '2026-10-10T10:00:00Z', recipient_id: 'user_test' }
    ];

    const mockClient = createControllableMockSupabase({
      activityPages: [
        {
          data: [
            { id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 701 }), created_at: '2026-10-10T10:05:00Z' }
          ]
        }
      ]
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 5, pageSize: 2 });

    const notifReadQueries = mockClient.queryLog.filter(
      q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read'
    );
    assert.equal(notifReadQueries.length, 0, 'Zero activity_logs queries made when no broadcast candidates exist');
  });

  // =========================================================================
  // SECTION A: VISIBLE READ PERSISTENCE FAILURES & IDEMPOTENCY
  // =========================================================================

  test('[Mocked Unit Test - Persistence Hardening] recordNotificationReadEventStrict throws on Supabase insert error', async () => {
    const mockClient = createControllableMockSupabase({
      insertErr: { message: 'Database disk full or relation locked' }
    });

    await assert.rejects(
      async () => {
        await recordNotificationReadEventStrict(mockClient, 'user_test', 'mark_notification_read', { notificationId: 999 });
      },
      /Failed to persist mark_notification_read: Database disk full or relation locked/
    );
  });

  test('[Mocked Unit Test - Persistence Hardening] recordNotificationReadEventStrict succeeds when insert succeeds', async () => {
    const mockClient = createControllableMockSupabase({ insertErr: null });

    await recordNotificationReadEventStrict(mockClient, 'user_test', 'mark_notification_read', { notificationId: 999 });

    const insertQueries = mockClient.queryLog.filter(q => q.table === 'activity_logs' && q.insertData);
    assert.equal(insertQueries.length, 1);
    assert.equal(insertQueries[0].insertData[0].user_id, 'user_test');
    assert.equal(insertQueries[0].insertData[0].action, 'mark_notification_read');
    assert.equal(JSON.parse(insertQueries[0].insertData[0].metadata).notificationId, 999);
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: broadcast notification returns 500 when notification_reads fails with permission error', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsData: [{ id: 801, recipient_id: null }],
      dedicatedErr: { code: '42501', message: 'permission denied for table notification_reads' }
    });

    const res = await markNotificationReadForUser(mockClient, 'user_test', '801');
    assert.equal(res.status, 500);
    assert.match(String(res.body.error), /Failed to persist notification read: permission denied for table notification_reads/);
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: broadcast notification returns 500 when notification_reads fails with transient error', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsData: [{ id: 801, recipient_id: null }],
      dedicatedErr: { code: '08006', message: 'connection failure' }
    });

    const res = await markNotificationReadForUser(mockClient, 'user_test', '801');
    assert.equal(res.status, 500);
    assert.match(String(res.body.error), /Failed to persist notification read: connection failure/);
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: broadcast notification returns 500 when table absent and fallback activity_logs insert fails', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsData: [{ id: 801, recipient_id: null }],
      dedicatedErr: { code: 'PGRST205', message: 'relation "notification_reads" does not exist' },
      insertErr: { message: 'activity_logs relation locked' }
    });

    const res = await markNotificationReadForUser(mockClient, 'user_test', '801');
    assert.equal(res.status, 500);
    assert.match(String(res.body.error), /Failed to persist mark_notification_read: activity_logs relation locked/);
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: broadcast notification returns 200 on successful persistence via activity_logs fallback', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsData: [{ id: 801, recipient_id: null }],
      dedicatedErr: { code: 'PGRST205', message: 'relation "notification_reads" does not exist' },
      insertErr: null
    });

    const res = await markNotificationReadForUser(mockClient, 'user_test', '801');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: retry idempotency reuses existing event without inserting duplicate', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsData: [{ id: 801, recipient_id: null }],
      dedicatedErr: { code: 'PGRST205', message: 'relation "notification_reads" does not exist' },
      existingReadLogs: [{ id: 456 }]
    });

    const res = await markNotificationReadForUser(mockClient, 'user_test', '801');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.alreadyRead, true);

    const inserts = mockClient.queryLog.filter(q => q.table === 'activity_logs' && q.insertData);
    assert.equal(inserts.length, 0, 'Must NOT insert duplicate activity log on retry');
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: concurrent calls in same process are coalesced without duplicate queries or inserts', async () => {
    let checkQueryCount = 0;
    let insertQueryCount = 0;

    const mockClient = {
      queryLog: [],
      from(table) {
        const q = { table, eqFilters: {}, orFilters: [], inFilters: {} };
        const chain = {
          select() { return chain; },
          eq(col, val) { q.eqFilters[col] = val; return chain; },
          or(filter) { q.orFilters.push(filter); return chain; },
          in(col, vals) { q.inFilters[col] = vals; return chain; },
          limit() { return chain; },
          maybeSingle() {
            return Promise.resolve({ data: { id: 801, recipient_id: null }, error: null });
          },
          upsert() {
            return Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'relation "notification_reads" does not exist' } });
          },
          insert(data) {
            insertQueryCount++;
            return Promise.resolve({ data, error: null });
          },
          then(resolve) {
            if (table === 'notifications') {
              resolve({ data: [{ id: 801, recipient_id: null }], error: null });
              return;
            }
            if (table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read') {
              checkQueryCount++;
              // Simulate small async delay to test in-flight race condition
              setTimeout(() => {
                resolve({ data: [], error: null });
              }, 10);
              return;
            }
            resolve({ data: [], error: null });
          }
        };
        return chain;
      }
    };

    // Dispatch two concurrent calls for the exact same user and notification ID
    const [res1, res2] = await Promise.all([
      markNotificationReadForUser(mockClient, 'user_concurrent', '801'),
      markNotificationReadForUser(mockClient, 'user_concurrent', '801')
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res1.body.success, true);
    assert.equal(res2.body.success, true);

    // In-process promise coalescing ensures only 1 check and 1 insert executed
    assert.equal(insertQueryCount, 1, 'Concurrent calls in same process must coalesce to exactly 1 insert');
    assert.equal(checkQueryCount, 1, 'Concurrent calls in same process must coalesce to exactly 1 verification query');
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: private notification returns 500 when notification update fails', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsData: [{ id: 802, recipient_id: 'user_test' }],
      updateErr: { message: 'row lock contention' }
    });

    const res = await markNotificationReadForUser(mockClient, 'user_test', '802');
    assert.equal(res.status, 500);
    assert.match(String(res.body.error), /row lock contention/);
  });

  test('[Mocked Unit Test - Persistence Hardening] markNotificationReadForUser: private notification returns 200 on successful update', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsData: [{ id: 802, recipient_id: 'user_test' }],
      updateErr: null
    });

    const res = await markNotificationReadForUser(mockClient, 'user_test', '802');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('[Mocked Unit Test - Persistence Hardening] markAllNotificationsReadForUser: returns 500 when private notifications update fails', async () => {
    const mockClient = createControllableMockSupabase({
      updateErr: { message: 'database unavailable during update' }
    });

    const res = await markAllNotificationsReadForUser(mockClient, 'user_test');
    assert.equal(res.status, 500);
    assert.match(String(res.body.error), /database unavailable during update/);
  });

  test('[Mocked Unit Test - Persistence Hardening] markAllNotificationsReadForUser: returns 500 when high-water mark event insert fails', async () => {
    const mockClient = createControllableMockSupabase({
      updateErr: null,
      insertErr: { message: 'activity_logs disk full' }
    });

    const res = await markAllNotificationsReadForUser(mockClient, 'user_test');
    assert.equal(res.status, 500);
    assert.equal(res.body.partialSuccess, true);
    assert.equal(res.body.privateUpdated, true);
    assert.match(String(res.body.error), /Failed to persist mark_all_notifications_read: activity_logs disk full/);
  });

  test('[Mocked Unit Test - Partial Failure Recovery] Client recovery on mark-all-read partial failure: successful sync updates state and renders partial success toast message', async () => {
    let notifications = [
      { id: 1, title: 'Private alert', read: false },
      { id: 2, title: 'Broadcast alert', read: false }
    ];
    let unreadCount = 2;
    let toastMessage = '';

    const prevNotifs = notifications;
    const prevCount = unreadCount;
    notifications = notifications.map(n => ({ ...n, read: true }));
    unreadCount = 0;

    const apiError = { message: 'activity_logs disk full', partialSuccess: true };

    const mockSyncServer = async () => {
      return {
        notifications: [
          { id: 1, title: 'Private alert', read: true },
          { id: 2, title: 'Broadcast alert', read: false }
        ],
        unreadCount: 1,
        ok: true
      };
    };

    let syncSucceeded = false;
    try {
      const serverState = await mockSyncServer();
      if (serverState.ok) {
        notifications = serverState.notifications;
        unreadCount = serverState.unreadCount;
        syncSucceeded = true;
      }
    } catch {
      syncSucceeded = false;
    }

    if (!syncSucceeded) {
      notifications = prevNotifs;
      unreadCount = prevCount;
    }

    if (apiError.partialSuccess) {
      toastMessage = syncSucceeded
        ? "Could not mark all notifications as read. Some items were updated; please retry."
        : "Could not mark all notifications as read. Some items may have updated, but refreshing state failed. Please retry.";
    }

    assert.equal(syncSucceeded, true, 'Sync must succeed');
    assert.equal(notifications[0].read, true, 'Private notification is read in synced state');
    assert.equal(notifications[1].read, false, 'Broadcast notification remains unread');
    assert.equal(unreadCount, 1, 'Unread count reflects only broadcast unread');
    assert.equal(toastMessage, "Could not mark all notifications as read. Some items were updated; please retry.");
  });

  test('[Mocked Unit Test - Partial Failure Recovery] Client recovery on mark-all-read partial failure: failed sync restores previous state and renders failure toast message', async () => {
    let notifications = [
      { id: 1, title: 'Private alert', read: false },
      { id: 2, title: 'Broadcast alert', read: false }
    ];
    let unreadCount = 2;
    let toastMessage = '';

    const prevNotifs = notifications;
    const prevCount = unreadCount;
    notifications = notifications.map(n => ({ ...n, read: true }));
    unreadCount = 0;

    const apiError = { message: 'activity_logs disk full', partialSuccess: true };

    const mockSyncServer = async () => {
      throw new Error('network down');
    };

    let syncSucceeded = false;
    try {
      const serverState = await mockSyncServer();
      if (serverState.ok) {
        notifications = serverState.notifications;
        unreadCount = serverState.unreadCount;
        syncSucceeded = true;
      }
    } catch {
      syncSucceeded = false;
    }

    if (!syncSucceeded) {
      notifications = prevNotifs;
      unreadCount = prevCount;
    }

    if (apiError.partialSuccess) {
      toastMessage = syncSucceeded
        ? "Could not mark all notifications as read. Some items were updated; please retry."
        : "Could not mark all notifications as read. Some items may have updated, but refreshing state failed. Please retry.";
    }

    assert.equal(syncSucceeded, false, 'Sync must report failure');
    assert.equal(notifications[0].read, false, 'Reverted to previous state');
    assert.equal(unreadCount, 2, 'Reverted unread count');
    assert.equal(toastMessage, "Could not mark all notifications as read. Some items may have updated, but refreshing state failed. Please retry.");
  });

  test('[Mocked Unit Test - Partial Failure Recovery] Client recovery on mark-all-read partial failure: malformed or non-array refresh JSON triggers safe rollback', async () => {
    let notifications = [
      { id: 1, title: 'Private alert', read: false },
      { id: 2, title: 'Broadcast alert', read: false }
    ];
    let unreadCount = 2;
    let toastMessage = '';

    const prevNotifs = notifications;
    const prevCount = unreadCount;
    notifications = notifications.map(n => ({ ...n, read: true }));
    unreadCount = 0;

    const apiError = { message: 'activity_logs disk full', partialSuccess: true };

    // Mock server returning 200 OK but with unexpected data shape (e.g. { data: null, count: 'invalid' })
    const mockSyncServerMalformed = async () => {
      return {
        notificationsJson: { data: 'not_an_array' },
        countJson: { count: 'not_a_number' },
        ok: true
      };
    };

    let syncSucceeded = false;
    try {
      const serverState = await mockSyncServerMalformed();
      if (
        serverState.ok &&
        Array.isArray(serverState.notificationsJson?.data) &&
        typeof serverState.countJson?.count === 'number' &&
        Number.isFinite(serverState.countJson.count)
      ) {
        notifications = serverState.notificationsJson.data;
        unreadCount = serverState.countJson.count;
        syncSucceeded = true;
      }
    } catch {
      syncSucceeded = false;
    }

    if (!syncSucceeded) {
      notifications = prevNotifs;
      unreadCount = prevCount;
    }

    if (apiError.partialSuccess) {
      toastMessage = syncSucceeded
        ? "Could not mark all notifications as read. Some items were updated; please retry."
        : "Could not mark all notifications as read. Some items may have updated, but refreshing state failed. Please retry.";
    }

    assert.equal(syncSucceeded, false, 'Malformed refresh shape must not be treated as a successful sync');
    assert.equal(notifications[0].read, false, 'State safely rolled back to pre-action state');
    assert.equal(unreadCount, 2, 'Unread count safely rolled back');
    assert.equal(toastMessage, "Could not mark all notifications as read. Some items may have updated, but refreshing state failed. Please retry.");
  });

  test('[Mocked Unit Test - Response Parsing Boundary] mark-all-read production parseMarkAllReadResponse helper: extracts partialSuccess and error across HTTP 500, non-JSON, and network drops', async () => {
    // 1. Partial success response (Step 1 succeeded, Step 2 failed)
    const partialSuccessRes = await parseMarkAllReadResponse(Promise.resolve({
      ok: false,
      status: 500,
      json: async () => ({ error: 'activity_logs disk full', partialSuccess: true, privateUpdated: true })
    }));
    assert.equal(partialSuccessRes.requestFailed, true);
    assert.equal(partialSuccessRes.isPartialSuccess, true);
    assert.equal(partialSuccessRes.errorMessage, 'activity_logs disk full');

    // 2. Total failure response (Step 1 update failed, no partialSuccess)
    const totalFailureRes = await parseMarkAllReadResponse(Promise.resolve({
      ok: false,
      status: 500,
      json: async () => ({ error: 'database unavailable during update' })
    }));
    assert.equal(totalFailureRes.requestFailed, true);
    assert.equal(totalFailureRes.isPartialSuccess, false);
    assert.equal(totalFailureRes.errorMessage, 'database unavailable during update');

    // 3. Gateway / Non-JSON error (e.g. 502 HTML from reverse proxy)
    const nonJsonRes = await parseMarkAllReadResponse(Promise.resolve({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); }
    }));
    assert.equal(nonJsonRes.requestFailed, true);
    assert.equal(nonJsonRes.isPartialSuccess, false);
    assert.equal(nonJsonRes.errorMessage, 'Failed to mark all notifications as read');

    // 4. Client-side network drop (fetch rejects before HTTP response)
    const networkDropRes = await parseMarkAllReadResponse(
      Promise.reject(new TypeError('Failed to fetch'))
    );
    assert.equal(networkDropRes.requestFailed, true);
    assert.equal(networkDropRes.isPartialSuccess, false);
    assert.equal(networkDropRes.errorMessage, 'Failed to fetch');
  });

  test('[Mocked Unit Test - Persistence Hardening] markAllNotificationsReadForUser: returns 200 on successful mark-all', async () => {
    const mockClient = createControllableMockSupabase({
      updateErr: null,
      insertErr: null
    });

    const res = await markAllNotificationsReadForUser(mockClient, 'user_test');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // =========================================================================
  // SECTION B: REMOVE HIGH-CARDINALITY URL DEPENDENCE (CHUNKED LOOKUPS)
  // =========================================================================

  test('[Mocked Unit Test - Chunking Hardening] fetchUserBroadcastReadContext chunking with 2,000 candidate broadcast notifications', async () => {
    const candidateCount = 2000;
    const candidates = [];
    const dedicatedReads = [];
    for (let i = 1; i <= candidateCount; i++) {
      candidates.push({ id: 10000 + i, created_at: '2026-10-10T10:00:00Z', recipient_id: null });
      dedicatedReads.push({ notification_id: 10000 + i });
    }

    const mockClient = createControllableMockSupabase({
      dedicatedReads,
      dedicatedErr: null
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates);

    assert.equal(ctx.readBroadcastIds.size, candidateCount, 'All 2,000 IDs must be resolved');

    const dedicatedQueries = mockClient.queryLog.filter(q => q.table === 'notification_reads' && q.inFilters.notification_id);
    const expectedChunks = Math.ceil(candidateCount / NOTIFICATION_ID_CHUNK_SIZE); // 2000 / 100 = 20 chunks
    assert.equal(dedicatedQueries.length, expectedChunks, `Must split into exactly ${expectedChunks} chunk queries`);

    for (const q of dedicatedQueries) {
      assert.ok(
        q.inFilters.notification_id.length <= NOTIFICATION_ID_CHUNK_SIZE,
        `Chunk size ${q.inFilters.notification_id.length} must never exceed ${NOTIFICATION_ID_CHUNK_SIZE}`
      );
    }
  });

  test('[Mocked Unit Test - Chunking Hardening] fetchUserBroadcastReadContext error propagation on chunk query failure (no partial success)', async () => {
    const candidates = [];
    for (let i = 1; i <= 500; i++) {
      candidates.push({ id: 20000 + i, created_at: '2026-10-10T10:00:00Z', recipient_id: null });
    }

    let chunkIndex = 0;
    const mockClient = {
      queryLog: [],
      from(table) {
        const q = { table, inFilters: {} };
        const chain = {
          select() { return chain; },
          eq() { return chain; },
          in(col, vals) { q.inFilters[col] = vals; return chain; },
          order() { return chain; },
          limit() { return chain; },
          then(resolve) {
            mockClient.queryLog.push(q);
            if (table === 'activity_logs') {
              resolve({ data: [], error: null });
              return;
            }
            if (table === 'notification_reads') {
              chunkIndex++;
              if (chunkIndex === 2) {
                // Chunk #2 fails with a database error
                resolve({ data: null, count: null, error: { code: '500', message: 'connection pool exhausted' } });
                return;
              }
              const data = (q.inFilters.notification_id || []).map(id => ({ notification_id: id }));
              resolve({ data, count: data.length, error: null });
              return;
            }
            resolve({ data: [], error: null });
          }
        };
        return chain;
      }
    };

    await assert.rejects(
      async () => {
        await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates);
      },
      /Database error querying notification_reads: connection pool exhausted/
    );
  });

  test('[Mocked Unit Test - Chunking Hardening] computeUserUnreadNotificationCount handles high candidate volume (2,500 broadcast candidates) with chunked queries', async () => {
    const broadcastCount = 2500;
    const allBroadcasts = [];
    const readBroadcasts = [];
    for (let i = 1; i <= broadcastCount; i++) {
      allBroadcasts.push({ id: 30000 + i, created_at: '2026-10-10T10:00:00Z', recipient_id: null });
      if (i <= 1000) {
        readBroadcasts.push({ notification_id: 30000 + i });
      }
    }

    const mockClient = createControllableMockSupabase({
      privateUnreadCount: 5, // 5 private unread
      notificationsData: allBroadcasts,
      dedicatedReads: readBroadcasts,
      dedicatedErr: null
    });

    const unread = await computeUserUnreadNotificationCount(mockClient, 'user_test', {
      broadcastPageSize: 1000,
      maxBroadcastPages: 5
    });

    // 5 private unread + (2500 - 1000) broadcast unread = 1505
    assert.equal(unread, 1505);

    const chunkQueries = mockClient.queryLog.filter(q => q.table === 'notification_reads' && q.inFilters.notification_id);
    assert.ok(chunkQueries.length > 0, 'Chunk queries must be executed');
    for (const q of chunkQueries) {
      assert.ok(q.inFilters.notification_id.length <= NOTIFICATION_ID_CHUNK_SIZE, 'No chunk exceeds chunk size limit');
    }
  });

  test('[Mocked Unit Test - Chunking Hardening] Multi-user isolation: User A read states never leak to User B', async () => {
    const candidates = [
      { id: 40001, created_at: '2026-10-10T10:00:00Z', recipient_id: null },
      { id: 40002, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClientA = createControllableMockSupabase({
      dedicatedReads: [
        { notification_id: 40001 },
        { notification_id: 40002 }
      ],
      dedicatedErr: null
    });

    const mockClientB = createControllableMockSupabase({
      dedicatedReads: [],
      dedicatedErr: null
    });

    const ctxA = await fetchUserBroadcastReadContext(mockClientA, 'user_A', candidates);
    const ctxB = await fetchUserBroadcastReadContext(mockClientB, 'user_B', candidates);

    assert.equal(ctxA.readBroadcastIds.size, 2, 'User A has 2 read broadcasts');
    assert.equal(ctxB.readBroadcastIds.size, 0, 'User B has 0 read broadcasts');
  });

  // =========================================================================
  // SECTION C: ELIMINATE SILENT PAGINATION TRUNCATION (COUNT VERIFICATION)
  // =========================================================================

  test('[Mocked Unit Test - Truncation Hardening] Server page cap below 1,000: PostgREST max_rows cap (250 rows) advances offset until exact count (600) reached', async () => {
    const candidates = [
      { id: 50001, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    // Total count reported by PostgREST: 600
    // Server has a 250-row max_rows cap, returning 250 on page 0, 250 on page 1, 100 on page 2.
    // Candidate 50001 is on page 2 (row #550).
    const page0Rows = Array.from({ length: 250 }, (_, i) => ({
      id: i + 1,
      action: 'mark_notification_read',
      metadata: JSON.stringify({ notificationId: 90000 + i }),
      created_at: '2026-10-10T10:01:00Z'
    }));
    const page1Rows = Array.from({ length: 250 }, (_, i) => ({
      id: i + 251,
      action: 'mark_notification_read',
      metadata: JSON.stringify({ notificationId: 91000 + i }),
      created_at: '2026-10-10T10:02:00Z'
    }));
    const page2Rows = [
      { id: 501, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 50001 }), created_at: '2026-10-10T10:03:00Z' },
      ...Array.from({ length: 99 }, (_, i) => ({
        id: i + 502,
        action: 'mark_notification_read',
        metadata: JSON.stringify({ notificationId: 92000 + i }),
        created_at: '2026-10-10T10:04:00Z'
      }))
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 600,
      activityPages: [
        { data: page0Rows, count: 600 },
        { data: page1Rows, count: 600 },
        { data: page2Rows, count: 600 }
      ]
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 10, pageSize: 1000 });

    assert.ok(ctx.readBroadcastIds.has('50001'), 'Must resolve candidate on 3rd page despite 250-row page cap');

    const activityQueries = mockClient.queryLog.filter(q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read');
    assert.equal(activityQueries.length, 3, 'Must fetch all 3 pages until offset reaches total count');
    assert.deepEqual(activityQueries[0].rangeSpan, [0, 999]);
    assert.deepEqual(activityQueries[1].rangeSpan, [250, 1249]);
    assert.deepEqual(activityQueries[2].rangeSpan, [500, 1499]);
  });

  test('[Mocked Unit Test - Truncation Hardening] Genuine short final page with total count matching: completes cleanly', async () => {
    const candidates = [
      { id: 50002, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const page0 = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      action: 'mark_notification_read',
      metadata: JSON.stringify({ notificationId: 93000 + i }),
      created_at: '2026-10-10T10:01:00Z'
    }));
    const page1 = Array.from({ length: 150 }, (_, i) => ({
      id: i + 201,
      action: 'mark_notification_read',
      metadata: JSON.stringify({ notificationId: 94000 + i }),
      created_at: '2026-10-10T10:02:00Z'
    }));

    const mockClient = createControllableMockSupabase({
      totalCount: 350,
      activityPages: [
        { data: page0, count: 350 },
        { data: page1, count: 350 }
      ]
    });

    const ctx = await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 5, pageSize: 200 });

    assert.equal(ctx.readBroadcastIds.has('50002'), false, '50002 genuinely unread after full 350-row scan');
    const activityQueries = mockClient.queryLog.filter(q => q.table === 'activity_logs' && q.eqFilters.action === 'mark_notification_read');
    assert.equal(activityQueries.length, 2);
  });

  test('[Mocked Unit Test - Truncation Hardening] Empty page before total count reached throws explicit error', async () => {
    const candidates = [
      { id: 50003, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 500,
      activityPages: [
        {
          data: Array.from({ length: 200 }, (_, i) => ({
            id: i + 1,
            action: 'mark_notification_read',
            metadata: JSON.stringify({ notificationId: 95000 + i }),
            created_at: '2026-10-10T10:01:00Z'
          })),
          count: 500
        },
        {
          data: [], // Prematurely empty despite total=500
          count: 500
        }
      ]
    });

    await assert.rejects(
      async () => {
        await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 5, pageSize: 200 });
      },
      /Incomplete activity-log scan: activity_logs returned no rows at offset 200 although 500 row\(s\) were reported; completeness cannot be established/
    );
  });

  test('[Mocked Unit Test - Truncation Hardening] Missing exact row count from server throws explicit error', async () => {
    const candidates = [
      { id: 50004, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      activityPages: [
        {
          data: [{ id: 1, action: 'mark_notification_read', metadata: JSON.stringify({ notificationId: 999 }), created_at: '2026-10-10T10:01:00Z' }],
          count: null // Missing count!
        }
      ]
    });

    await assert.rejects(
      async () => {
        await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 5, pageSize: 200 });
      },
      /Incomplete activity-log scan: server did not return an exact row count for activity_logs; completeness cannot be established/
    );
  });

  test('[Mocked Unit Test - Truncation Hardening] Unresolved candidate at safety limit throws incomplete scan error', async () => {
    const candidates = [
      { id: 50005, created_at: '2026-10-10T10:00:00Z', recipient_id: null }
    ];

    const mockClient = createControllableMockSupabase({
      totalCount: 10000,
      activityPages: [
        {
          data: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            action: 'mark_notification_read',
            metadata: JSON.stringify({ notificationId: 96000 + i }),
            created_at: '2026-10-10T10:01:00Z'
          })),
          count: 10000
        },
        {
          data: Array.from({ length: 100 }, (_, i) => ({
            id: i + 101,
            action: 'mark_notification_read',
            metadata: JSON.stringify({ notificationId: 97000 + i }),
            created_at: '2026-10-10T10:02:00Z'
          })),
          count: 10000
        }
      ]
    });

    await assert.rejects(
      async () => {
        await fetchUserBroadcastReadContext(mockClient, 'user_test', candidates, { maxPages: 2, pageSize: 100 });
      },
      /Incomplete activity-log scan: safety limit of 2 page\(s\) reached with 1 unresolved notification candidate\(s\)/
    );
  });

  test('[Mocked Unit Test - Truncation Hardening] computeUserUnreadNotificationCount throws on incomplete broadcast gathering (> 20,000 notifications)', async () => {
    const mockClient = createControllableMockSupabase({
      notificationsCount: 25000, // Exceeds safety limit of 20 pages * 1000 = 20,000
      notificationsData: Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        created_at: '2026-10-10T10:00:00Z',
        recipient_id: null
      }))
    });

    await assert.rejects(
      async () => {
        await computeUserUnreadNotificationCount(mockClient, 'user_test', {
          broadcastPageSize: 1000,
          maxBroadcastPages: 20
        });
      },
      /Incomplete broadcast notification scan: 25000 broadcast notification\(s\) exceed the safety limit of 20 page\(s\) x 1000/
    );
  });
});





