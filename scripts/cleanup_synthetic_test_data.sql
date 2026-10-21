-- ============================================================================
-- FK-AWARE SYNTHETIC TEST DATA CLEANUP SCRIPT (WITH DRY-RUN & TRANSACTION SAFETY)
-- File: scripts/cleanup_synthetic_test_data.sql
-- TARGET: Supabase Production SQL Editor (Owner execution only after reviewing results)
-- NOTE: Default mode executes as DRY-RUN (ROLLBACK at the end).
--       To execute real deletion, change the final ROLLBACK to COMMIT.
-- ============================================================================

BEGIN;

-- Create temporary table to stage candidate test user IDs
CREATE TEMP TABLE tmp_test_teachers AS
SELECT id, auth_user_id, email, name
FROM public.teachers
WHERE email ILIKE '%teacher_a_%'
   OR email ILIKE '%teacher_b_%'
   OR email ILIKE '%audit_tr_%'
   OR email ILIKE '%tr.visual.%'
   OR email ILIKE '%@jiddah.local%'
   OR email ILIKE '%test.local%';

CREATE TEMP TABLE tmp_test_students AS
SELECT id, name
FROM public.students
WHERE name ILIKE '%test%'
   OR name ILIKE '%synthetic%'
   OR name ILIKE '%sample%'
   OR name ILIKE '%dummy%'
   OR (created_at >= '2026-09-22 00:00:00+00' AND created_at <= '2026-09-24 23:59:59+00' AND name ILIKE '%Student%');

-- ============================================================================
-- 1. DRY RUN REPORT: LIST WHAT WILL BE REMOVED
-- ============================================================================
SELECT 'Test Teachers to be Cleaned' as category, count(*) as count FROM tmp_test_teachers;
SELECT 'Test Students to be Cleaned' as category, count(*) as count FROM tmp_test_students;

SELECT 'Circular Marks from Test Data' as category, count(*) as count
FROM public.circular_marks
WHERE updated_by IN (SELECT id FROM tmp_test_teachers)
   OR enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM tmp_test_students));

SELECT 'Theology Marks from Test Data' as category, count(*) as count
FROM public.theology_marks
WHERE updated_by IN (SELECT id FROM tmp_test_teachers)
   OR enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM tmp_test_students));

SELECT 'Teacher Class Assignments' as category, count(*) as count
FROM public.teacher_class_assignments
WHERE teacher_id IN (SELECT id FROM tmp_test_teachers);

SELECT 'Teacher Signatures' as category, count(*) as count
FROM public.signatures
WHERE teacher_id IN (SELECT id FROM tmp_test_teachers);

-- ============================================================================
-- 2. FK-AWARE CASCADED DELETION SEQUENCE
-- ============================================================================

-- Step 2.1: Delete marks referencing test enrollments or test teachers
DELETE FROM public.circular_marks
WHERE updated_by IN (SELECT id FROM tmp_test_teachers)
   OR enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM tmp_test_students));

DELETE FROM public.theology_marks
WHERE updated_by IN (SELECT id FROM tmp_test_teachers)
   OR enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM tmp_test_students));

-- Step 2.2: Delete enrollments of test students
DELETE FROM public.enrollments
WHERE student_id IN (SELECT id FROM tmp_test_students);

-- Step 2.3: Delete test students
DELETE FROM public.students
WHERE id IN (SELECT id FROM tmp_test_students);

-- Step 2.4: Unlink circular_classes assigned to test teachers
UPDATE public.circular_classes
SET class_teacher_id = NULL
WHERE class_teacher_id IN (SELECT id FROM tmp_test_teachers);

-- Step 2.5: Delete teacher class assignments
DELETE FROM public.teacher_class_assignments
WHERE teacher_id IN (SELECT id FROM tmp_test_teachers);

-- Step 2.6: Delete teacher initials and signatures
DELETE FROM public.teacher_initials
WHERE teacher_id IN (SELECT id FROM tmp_test_teachers);

DELETE FROM public.signatures
WHERE teacher_id IN (SELECT id FROM tmp_test_teachers);

-- Step 2.7: Delete test notifications
DELETE FROM public.notifications
WHERE recipient_id IN (SELECT auth_user_id FROM tmp_test_teachers WHERE auth_user_id IS NOT NULL);

-- Step 2.8: Delete test teacher invites
DELETE FROM public.teacher_invites
WHERE email ILIKE '%@jiddah.local%' OR email ILIKE '%test.local%';

-- Step 2.9: Delete test teachers
DELETE FROM public.teachers
WHERE id IN (SELECT id FROM tmp_test_teachers);

-- Step 2.10: Delete test auth.users accounts
DELETE FROM auth.users
WHERE id IN (SELECT auth_user_id FROM tmp_test_teachers WHERE auth_user_id IS NOT NULL)
   OR email ILIKE '%@jiddah.local%'
   OR email ILIKE '%test.local%';

-- ============================================================================
-- 3. SAFETY SWITCH: DEFAULT TO ROLLBACK FOR AUDIT PREVIEW
--    Change to COMMIT only when the dry-run numbers above have been verified.
-- ============================================================================
ROLLBACK;
