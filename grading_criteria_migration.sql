-- grading_criteria_migration.sql

CREATE TABLE public.grading_criteria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    curriculum VARCHAR(50) NULL CHECK (curriculum IN ('secular', 'theology', NULL)),
    class_id UUID NULL,
    metric_type VARCHAR(100) NOT NULL,
    min_value NUMERIC NOT NULL,
    max_value NUMERIC NOT NULL,
    output_type VARCHAR(50) NOT NULL CHECK (output_type IN ('grade_label', 'comment')),
    output_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.grading_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" 
ON public.grading_criteria FOR SELECT TO authenticated USING (true);

-- Allow admins, Head Teachers, and DOS to manage criteria
CREATE POLICY "Allow full access to authorized roles" 
ON public.grading_criteria FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.teachers 
        WHERE id = auth.uid() AND role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'DOS Theology')
    )
);
