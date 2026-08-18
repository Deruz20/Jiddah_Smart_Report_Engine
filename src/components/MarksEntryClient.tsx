'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import { usePowerSync } from '@powersync/react'
import { SharedMarksEntry, ExamType } from './shared-marks-entry'
import { BYPASS_POWERSYNC_WRITES } from '@/lib/powersync/bypass'

import { TermData, EnrollmentData, CircularMarkRow, TheologyMarkRow } from '@/types/models'

interface MarksEntryClientProps {
  terms: TermData[]
}

export function MarksEntryClient({ terms }: MarksEntryClientProps) {
  const powerSync = usePowerSync()
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([])
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('')
  const [examType, setExamType] = useState<ExamType>('mot')
  const [circularMarks, setCircularMarks] = useState<CircularMarkRow[]>([])
  const [theologyMarks, setTheologyMarks] = useState<TheologyMarkRow[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [allowedDepartment, setAllowedDepartment] = useState<'secular' | 'theology' | 'both'>('both')

  // Load teacher department restriction from their assigned subject track
  useEffect(() => {
    const loadTeacherDept = async () => {
      try {
        const res = await powerSync.getAll('SELECT subject FROM teachers LIMIT 1')
        if (res && res.length > 0 && res[0].subject) {
          const track = res[0].subject.toLowerCase()
          if (track.includes('secular')) {
            setAllowedDepartment('secular')
          } else if (track.includes('theology')) {
            setAllowedDepartment('theology')
          } else {
            setAllowedDepartment('both')
          }
        }
      } catch (err) {
        console.error('Failed to load teacher subject track:', err)
      }
    }
    loadTeacherDept()
  }, [powerSync])

  // Load enrollments on mount
  useEffect(() => {
    const loadEnrollments = async () => {
      setIsFetching(true)
      setError(null)

      try {
        const data = await powerSync.getAll(`
          SELECT 
            e.id as enrollment_id,
            e.student_id,
            s.name, s.admission_number,
            cc.class_name as circular_class, cc.section,
            tc.class_name_arabic as theology_class_arabic,
            tc.class_name_english as theology_class_level
          FROM enrollments e
          JOIN students s ON e.student_id = s.id
          LEFT JOIN circular_classes cc ON e.circular_class_id = cc.id
          LEFT JOIN theology_classes tc ON e.theology_class_id = tc.id
          WHERE (s.is_archived IS NULL OR s.is_archived = 0 OR s.is_archived = 'false')
            AND (e.is_active IS NULL OR e.is_active = 1 OR e.is_active = 'true')
        `)
        
        const mappedEnrollments: EnrollmentData[] = data.map((e: any) => ({
          id: e.enrollment_id,
          student_id: e.student_id ?? null,
          name: e.name || 'Unknown Student',
          admission_number: e.admission_number || '',
          circular_class: e.circular_class || '',
          section: e.section || null,
          theology_class_arabic: e.theology_class_arabic || null,
          theology_class_level: e.theology_class_level || null,
          theology_status: e.theology_class_arabic ? 'active' : 'inactive',
        }))
        setEnrollments(mappedEnrollments)
      } catch (err: any) {
        if (err.message && err.message.includes('no such column')) {
          setError('System update required. Please log out and clear your browser cache/site data to sync the latest version.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load enrollments')
        }
      } finally {
        setIsFetching(false)
      }
    }

    loadEnrollments()
  }, [powerSync])

  // Load marks when enrollment or term changes
  useEffect(() => {
    if (!selectedEnrollmentId || !selectedTermId) {
      setCircularMarks([])
      setTheologyMarks([])
      return
    }

    const loadMarks = async () => {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const selectedEnrollment = enrollments.find(e => e.id === selectedEnrollmentId)
        const section = selectedEnrollment?.section || null
        const className = selectedEnrollment?.circular_class || null

        const circular = await powerSync.getAll(`
          SELECT 
            s.id as subject_id, s.subject_name, 'true' as is_core,
            cm.bot_score, cm.mot_score, cm.eot_score
          FROM subjects s
          LEFT JOIN circular_marks cm ON cm.subject_id = s.id AND cm.enrollment_id = ? AND cm.term_id = ?
          WHERE s.curriculum = 'secular' AND (s.section = ? OR s.section = ? OR s.section IS NULL)
        `, [selectedEnrollmentId, selectedTermId, section, className]);

        let theology: any[] = []
        if (selectedEnrollment?.theology_class_id) {
          // Fetch theology marks from PowerSync local DB
          const localMarks = await powerSync.getAll(`
            SELECT subject_id, mot_score, eot_score FROM theology_marks WHERE enrollment_id = ? AND term_id = ?
          `, [selectedEnrollmentId, selectedTermId]);
          
          const marksMap = new Map(localMarks.map(m => [m.subject_id, m]));

          // Fallback to fetch theology subjects from Supabase directly
          const supabase = createClient();
          const { data: theologyClassData } = await supabase
            .from('theology_classes')
            .select('level')
            .eq('id', selectedEnrollment.theology_class_id)
            .single();
          
          if (theologyClassData) {
            const { data: theologySubjects } = await supabase
              .from('theology_subjects')
              .select('id, subject_name_arabic')
              .eq('level', theologyClassData.level)
              .order('sort_order', { ascending: true });
            
            if (theologySubjects) {
              theology = theologySubjects.map(sub => {
                const m = marksMap.get(sub.id) || {};
                return {
                  subject_id: sub.id,
                  subject_name_arabic: sub.subject_name_arabic,
                  mot_score: m.mot_score ?? null,
                  eot_score: m.eot_score ?? null
                };
              });
            }
          }
        }

        setCircularMarks(circular as any)
        setTheologyMarks(theology as any)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marks')
      } finally {
        setIsLoading(false)
      }
    }

    loadMarks()
  }, [selectedEnrollmentId, selectedTermId, powerSync])

  const handleSaveMarks = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!selectedTermId || !selectedEnrollmentId) {
      setError('Please select a term and a student before saving marks.')
      return
    }

    // Validate circular marks
    for (const mark of circularMarks) {
      if (['bot', 'all'].includes(examType) && mark.bot_score !== null && (mark.bot_score < 0 || mark.bot_score > 100)) {
        setError('All circular scores must be between 0 and 100.')
        return
      }
      if (['mot', 'all'].includes(examType) && mark.mot_score !== null && (mark.mot_score < 0 || mark.mot_score > 100)) {
        setError('All circular scores must be between 0 and 100.')
        return
      }
      if (['eot', 'all'].includes(examType) && mark.eot_score !== null && (mark.eot_score < 0 || mark.eot_score > 100)) {
        setError('All circular scores must be between 0 and 100.')
        return
      }
    }

    // Validate theology marks
    for (const mark of theologyMarks) {
      if (['mot', 'all'].includes(examType) && mark.mot_score !== null && (mark.mot_score < 0 || mark.mot_score > 100)) {
        setError('All theology scores must be between 0 and 100.')
        return
      }
      if (['eot', 'all'].includes(examType) && mark.eot_score !== null && (mark.eot_score < 0 || mark.eot_score > 100)) {
        setError('All theology scores must be between 0 and 100.')
        return
      }
    }

    setIsSaving(true)

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id

        if (BYPASS_POWERSYNC_WRITES) {
          const { data: existingC, error: errC } = await supabase.from('circular_marks').select('id, subject_id').eq('enrollment_id', selectedEnrollmentId).eq('term_id', selectedTermId);
          if (errC) throw errC;
          
          for (const mark of circularMarks) {
            const bot = mark.bot_score ?? null;
            const mot = mark.mot_score ?? null;
            const eot = mark.eot_score ?? null;
            const existing = existingC?.find(e => e.subject_id === mark.subject_id);
            
            if (existing) {
              const { error } = await supabase.from('circular_marks').update({
                bot_score: bot,
                mot_score: mot,
                eot_score: eot,
                updated_by: userId
              }).eq('id', existing.id);
              if (error) throw error;
            } else {
              const { error } = await supabase.from('circular_marks').insert({
                enrollment_id: selectedEnrollmentId,
                term_id: selectedTermId,
                subject_id: mark.subject_id,
                bot_score: bot,
                mot_score: mot,
                eot_score: eot,
                updated_by: userId
              });
              if (error) throw error;
            }
          }
          
          const { data: existingT, error: errT } = await supabase.from('theology_marks').select('id, subject_id').eq('enrollment_id', selectedEnrollmentId).eq('term_id', selectedTermId);
          if (errT) throw errT;
          
          for (const mark of theologyMarks) {
            const mot = mark.mot_score ?? null;
            const eot = mark.eot_score ?? null;
            const existing = existingT?.find(e => e.subject_id === mark.subject_id);
            
            if (existing) {
              const { error } = await supabase.from('theology_marks').update({
                mot_score: mot,
                eot_score: eot,
                updated_by: userId
              }).eq('id', existing.id);
              if (error) throw error;
            } else {
              const { error } = await supabase.from('theology_marks').insert({
                enrollment_id: selectedEnrollmentId,
                term_id: selectedTermId,
                subject_id: mark.subject_id,
                mot_score: mot,
                eot_score: eot,
                updated_by: userId
              });
              if (error) throw error;
            }
          }
        } else {
          await powerSync.writeTransaction(async (tx) => {
            for (const mark of circularMarks) {
              let bot = mark.bot_score;
              let mot = mark.mot_score;
              let eot = mark.eot_score;
              
              // Upsert for circular marks
              const checkC = await tx.execute('SELECT id FROM circular_marks WHERE enrollment_id = ? AND subject_id = ? AND term_id = ?', [selectedEnrollmentId, mark.subject_id, selectedTermId]);
              if (checkC.rows?.length && checkC.rows.length > 0) {
                await tx.execute(`
                  UPDATE circular_marks SET bot_score = ?, mot_score = ?, eot_score = ?, updated_by = 'local_user' WHERE id = ?
                `, [bot ?? null, mot ?? null, eot ?? null, checkC.rows.item(0).id]);
              } else {
                await tx.execute(`
                  INSERT INTO circular_marks (id, enrollment_id, subject_id, term_id, bot_score, mot_score, eot_score, updated_by)
                  VALUES (uuid(), ?, ?, ?, ?, ?, ?, 'local_user')
                `, [selectedEnrollmentId, mark.subject_id, selectedTermId, bot ?? null, mot ?? null, eot ?? null]);
              }
            }

            for (const mark of theologyMarks) {
              let mot = mark.mot_score;
              let eot = mark.eot_score;
              
              // Upsert for theology marks
              const checkT = await tx.execute('SELECT id FROM theology_marks WHERE enrollment_id = ? AND subject_id = ? AND term_id = ?', [selectedEnrollmentId, mark.subject_id, selectedTermId]);
              if (checkT.rows?.length && checkT.rows.length > 0) {
                await tx.execute(`
                  UPDATE theology_marks SET mot_score = ?, eot_score = ?, updated_by = 'local_user' WHERE id = ?
                `, [mot ?? null, eot ?? null, checkT.rows.item(0).id]);
              } else {
                await tx.execute(`
                  INSERT INTO theology_marks (id, enrollment_id, subject_id, term_id, mot_score, eot_score, updated_by)
                  VALUES (uuid(), ?, ?, ?, ?, ?, 'local_user')
                `, [selectedEnrollmentId, mark.subject_id, selectedTermId, mot ?? null, eot ?? null]);
              }
            }
          });
        }

        setSuccess(true)
        setTimeout(() => setSuccess(false), 3500)
      } catch (err: any) {
        console.error('supabase error', { name: err?.name, message: err?.message, code: err?.code, details: err?.details, hint: err?.hint, status: err?.status, full: err })
        setError(err?.message || err?.details || 'An unexpected error occurred')
      } finally {
        setIsSaving(false)
      }
  }

  return (
    <SharedMarksEntry 
      terms={terms}
      enrollments={enrollments}
      selectedTermId={selectedTermId}
      onSelectTerm={setSelectedTermId}
      selectedEnrollmentId={selectedEnrollmentId}
      onSelectEnrollment={setSelectedEnrollmentId}
      circularMarks={circularMarks}
      setCircularMarks={setCircularMarks}
      theologyMarks={theologyMarks}
      setTheologyMarks={setTheologyMarks}
      examType={examType}
      setExamType={setExamType}
      isFetching={isFetching}
      isLoading={isLoading}
      isSaving={isSaving}
      isPending={isPending}
      error={error}
      success={success}
      setSuccess={setSuccess}
      onSave={handleSaveMarks}
      allowedDepartment={allowedDepartment}
    />
  )
}
