-- 1. Grading Standards
CREATE TABLE IF NOT EXISTS public.grading_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_type TEXT NOT NULL CHECK (grading_type IN ('secular', 'theology')),
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  remark TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.grading_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grading standards are globally readable"
  ON public.grading_standards FOR SELECT USING (true);

CREATE POLICY "DOS Secular can manage secular standards"
  ON public.grading_standards
  FOR ALL
  USING (
    grading_type = 'secular' AND
    EXISTS (
      SELECT 1 FROM public.teachers
      WHERE teachers.auth_user_id = auth.uid()
      AND teachers.role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'Deputy Head Teacher')
    )
  );

CREATE POLICY "DOS Theology can manage theology standards"
  ON public.grading_standards
  FOR ALL
  USING (
    grading_type = 'theology' AND
    EXISTS (
      SELECT 1 FROM public.teachers
      WHERE teachers.auth_user_id = auth.uid()
      AND teachers.role IN ('Administrator', 'Head Teacher', 'DOS Theology', 'Deputy Head Teacher')
    )
  );


-- 2. Report Templates
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  color_scheme TEXT DEFAULT 'emerald',
  theme_mode TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id)
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Report templates are globally readable"
  ON public.report_templates FOR SELECT USING (true);

CREATE POLICY "Homeroom teachers can manage their report templates"
  ON public.report_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.circular_classes
      WHERE circular_classes.id = report_templates.class_id
      AND circular_classes.class_teacher_id IN (
        SELECT id FROM public.teachers WHERE auth_user_id = auth.uid()
      )
    )
  );


-- 3. Exam Types
CREATE TABLE IF NOT EXISTS public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exam types are globally readable"
  ON public.exam_types FOR SELECT USING (true);

CREATE POLICY "Admins can manage exam types"
  ON public.exam_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers
      WHERE teachers.auth_user_id = auth.uid()
      AND teachers.role IN ('Administrator', 'Head Teacher')
    )
  );


-- 4. Special Exam Marks
CREATE TABLE IF NOT EXISTS public.special_exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_type_id UUID NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
  score REAL CHECK (score >= 0 AND score <= 100),
  updated_by UUID REFERENCES auth.users(id),
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enrollment_id, subject_id, exam_type_id)
);

ALTER TABLE public.special_exam_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view assigned special exam marks"
  ON public.special_exam_marks FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      LEFT JOIN public.teacher_class_assignments tca ON 
        (tca.class_id = e.circular_class_id OR tca.class_id = e.theology_class_id)
      LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
      WHERE e.id = special_exam_marks.enrollment_id
      AND (
        tca.teacher_id IN (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid()) OR
        cc.class_teacher_id IN (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Teachers can insert/update special exam marks"
  ON public.special_exam_marks FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      LEFT JOIN public.teacher_class_assignments tca ON 
        (tca.class_id = e.circular_class_id OR tca.class_id = e.theology_class_id)
      LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
      WHERE e.id = special_exam_marks.enrollment_id
      AND (
        tca.teacher_id IN (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid()) OR
        cc.class_teacher_id IN (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())
      )
    )
  );

-- Seed defaults for exam types
INSERT INTO public.exam_types (name, description) VALUES
('PRE-MOCK', 'Pre-Mock Examinations for P.7'),
('MOCK', 'Mock Examinations for P.7')
ON CONFLICT (name) DO NOTHING;
