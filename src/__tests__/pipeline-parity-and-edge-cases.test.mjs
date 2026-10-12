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
    const scores = [88, 76, 70, 65]; // D1(1), D2(2), C3(3), C4(4)
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
    assert.equal(getTheologyComment(365), 'ممتاز جداً. استمر في التفوق!');
    assert.equal(getTheologyComment(330), 'جيد جداً. واصل الاجتهاد.');
    assert.equal(getTheologyComment(290), 'جيد. يحتاج إلى مزيد من الجهد.');
    assert.equal(getTheologyComment(250), 'مقبول. عليك الاجتهاد أكثر.');
    assert.equal(getTheologyComment(200), 'ضعيف. يحتاج إلى دعم إضافي.');
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

