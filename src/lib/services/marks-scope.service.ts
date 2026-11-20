import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSectionType } from '@/lib/section-type'
import { subjectMatchesClassScope } from '@/lib/teacher-access'

/**
 * Result of a subject scope verification check.
 */
export interface SubjectScopeCheckResult {
  allowed: boolean
  error: string | null
}

/**
 * Verifies that a secular (circular) subject matches the educational level of a circular class cohort.
 */
export async function verifyCircularSubjectScope(
  supabase: SupabaseClient,
  classId: string | null,
  subjectId: string
): Promise<SubjectScopeCheckResult> {
  if (!classId) return { allowed: false, error: null }

  const [{ data: circularClass, error: classError }, { data: subject, error: subjectError }] =
    await Promise.all([
      supabase.from('circular_classes').select('section, class_name').eq('id', classId).maybeSingle(),
      supabase.from('circular_subjects').select('section').eq('id', subjectId).maybeSingle(),
    ])

  if (classError || subjectError) {
    return {
      allowed: false,
      error: classError?.message ?? subjectError?.message ?? 'Secular subject scope lookup failed.',
    }
  }

  const classSection = circularClass
    ? resolveSectionType(circularClass.section, circularClass.class_name)
    : null

  return {
    allowed: Boolean(subject && subjectMatchesClassScope(classSection, subject.section)),
    error: null,
  }
}

/**
 * Verifies that a theology subject matches the educational level of a theology class cohort.
 */
export async function verifyTheologySubjectScope(
  supabase: SupabaseClient,
  classId: string | null,
  subjectId: string
): Promise<SubjectScopeCheckResult> {
  if (!classId) return { allowed: false, error: null }

  const [{ data: theologyClass, error: classError }, { data: subject, error: subjectError }] =
    await Promise.all([
      supabase.from('theology_classes').select('level').eq('id', classId).maybeSingle(),
      supabase.from('theology_subjects').select('level').eq('id', subjectId).maybeSingle(),
    ])

  if (classError || subjectError) {
    return {
      allowed: false,
      error: classError?.message ?? subjectError?.message ?? 'Theology subject scope lookup failed.',
    }
  }

  return {
    allowed: Boolean(
      theologyClass && subject && subjectMatchesClassScope(theologyClass.level, subject.level)
    ),
    error: null,
  }
}

/**
 * Validates a mark score is between 0 and 100 or null.
 */
export function validateMarkBoundary(score: number | null | undefined): {
  valid: boolean
  error?: string
} {
  if (score === null || score === undefined) {
    return { valid: true }
  }
  if (!Number.isFinite(score)) {
    return { valid: false, error: 'Mark must be a finite numerical value' }
  }
  if (score < 0 || score > 100) {
    return { valid: false, error: 'Mark score must be between 0 and 100' }
  }
  return { valid: true }
}

/**
 * Safely parses raw score inputs into a number or null.
 */
export function parseRawScore(input: unknown): number | null {
  if (input === null || input === undefined || input === '') {
    return null
  }
  const parsed = Number(input)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed * 10) / 10)) : null
}
