-- Rehearsal wrapper to prove read-only execution of prod-schema-probe.sql
BEGIN READ ONLY;
\i scripts/prod-schema-probe.sql
ROLLBACK;

-- Negative test: Proves that BEGIN READ ONLY strictly blocks any write operation (SQLSTATE 25006)
BEGIN READ ONLY;
INSERT INTO public.teachers (name, role) VALUES ('Unauthorized Probe Write', 'Teacher');
ROLLBACK;
