-- 1. Enforce score bounds via CHECK constraints
-- circular_marks
ALTER TABLE public.circular_marks
  ADD CONSTRAINT circular_marks_bot_check CHECK (bot_mark >= 0 AND bot_mark <= 100),
  ADD CONSTRAINT circular_marks_mot_check CHECK (mot_mark >= 0 AND mot_mark <= 100),
  ADD CONSTRAINT circular_marks_eot_check CHECK (eot_mark >= 0 AND eot_mark <= 100);

-- theology_marks
ALTER TABLE public.theology_marks
  ADD CONSTRAINT theology_marks_bot_check CHECK (bot_mark >= 0 AND bot_mark <= 100),
  ADD CONSTRAINT theology_marks_mot_check CHECK (mot_mark >= 0 AND mot_mark <= 100),
  ADD CONSTRAINT theology_marks_eot_check CHECK (eot_mark >= 0 AND eot_mark <= 100);

-- 2. Ensure explicit UNIQUE constraints for PowerSync offline upserts
-- PowerSync relies on a unique index to do conflict resolution.

DO $$
BEGIN
    -- For circular_marks
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'circular_marks_enrollment_subject_key' 
        AND conrelid = 'public.circular_marks'::regclass
    ) THEN
        ALTER TABLE public.circular_marks ADD CONSTRAINT circular_marks_enrollment_subject_key UNIQUE (enrollment_id, subject_id);
    END IF;

    -- For theology_marks
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'theology_marks_enrollment_subject_key' 
        AND conrelid = 'public.theology_marks'::regclass
    ) THEN
        ALTER TABLE public.theology_marks ADD CONSTRAINT theology_marks_enrollment_subject_key UNIQUE (enrollment_id, subject_id);
    END IF;
END $$;
