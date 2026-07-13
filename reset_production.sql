-- Production Data Wipe
-- This script truncates sample data (students, enrollments, marks, reports) 
-- while preserving configured admin/DOS accounts, classes, subjects, and terms.

BEGIN;

-- Disable triggers temporarily to avoid constraint issues during bulk delete
SET session_replication_role = 'replica';

-- Truncate student-related data (this will also wipe marks, enrollments, and reports if CASCADE is used, but we'll do them explicitly)
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE enrollments CASCADE;
TRUNCATE TABLE marks CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE circular_comments CASCADE;
TRUNCATE TABLE theology_comments CASCADE;
TRUNCATE TABLE circular_headteacher_comments CASCADE;

-- Delete teachers who are NOT Administrator or DOS
-- Adjust the roles below if your system uses different exact strings for Admins/DOS
DELETE FROM teachers 
WHERE role NOT IN ('Administrator', 'Secular DOS', 'Theology DOS', 'Head Teacher');

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;
