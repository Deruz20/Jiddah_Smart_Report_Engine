import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, isValidEmail, normalizePhone, normalizeString, recordActivity } from '@/lib/api-server'
import { fetchMergedSchoolSettings, validateGradingBands } from '@/lib/school-settings-helper'

const baseDbColumns = [
  'school_name',
  'address',
  'district',
  'email',
  'phone_1',
  'phone_2',
  'pay_code',
  'current_term',
  'current_year',
]

const extendedDbColumns = [
  ...baseDbColumns,
  'arabic_name',
  'registration_number',
  'po_box',
  'website_url',
  'motto',
  'logo_url',
  'primary_font',
  'arabic_font',
  'theme_color',
  'report_theme_preset',
]

const allowedStringKeys = [
  ...extendedDbColumns,
  'name',
  'phone',
]

const allowedNumericKeys = ['current_year']

const allowedJsonKeys = [
  'ranking_preferences',
  'report_overlays',
  'grading_scale',
  'theology_grading_scale',
  'theology_remarks',
  'print_preferences',
  'division_boundaries',
  'fee_structure',
  'marks_locks',
]

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const user = await getAuthenticatedUser(supabase)
    if (user) {
      const metaRole = user.app_metadata?.role || user.user_metadata?.role
      const { isAdministratorRole } = await import('@/lib/teacher-access')
      if (!isAdministratorRole(metaRole)) {
        const { verifyDataAccess } = await import('@/lib/auth-server')
        try {
          await verifyDataAccess(supabase, user, 'read')
        } catch {
          // Allow read to proceed for authenticated staff
        }
      }
    }

    const { data: gradingCriteria, error: criteriaErr } = await supabase
      .from('grading_criteria')
      .select('*')
      .order('max_value', { ascending: false })

    if (criteriaErr && criteriaErr.code !== '42P01') {
      console.error('settings/school grading_criteria error:', criteriaErr.message)
    }

    const merged = await fetchMergedSchoolSettings(supabase, gradingCriteria || [])

    const formattedData = {
      ...merged,
      name: merged.school_name || merged.name || 'Jiddah Islamic Schools',
      school_name: merged.school_name || merged.name || 'Jiddah Islamic Schools',
      phone: merged.phone_1 || merged.phone || '',
      phone_1: merged.phone_1 || merged.phone || '',
      grading_criteria: gradingCriteria || [],
    }

    return withCors(request, NextResponse.json({ data: formattedData }))
  } catch (err: any) {
    console.error('settings/school GET exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function PATCH(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'write')
    const { isAdministratorRole } = await import('@/lib/teacher-access')
    const isAllowedRole =
      authRes.isAuthorized &&
      (isAdministratorRole(authRes.canonicalRole || authRes.role) ||
        authRes.role === 'Administrator' ||
        authRes.role === 'admin' ||
        authRes.role === 'Head Teacher' ||
        authRes.role === 'DOS Secular' ||
        authRes.role === 'DOS Theology' ||
        authRes.canonicalRole === 'DOS Secular' ||
        authRes.canonicalRole === 'DOS Theology')

    if (!isAllowedRole) {
      return withCors(request, NextResponse.json({ error: 'Access Denied: Administrator or DOS only' }, { status: 403 }))
    }

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return withCors(request, NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
    }

    const updatePayload: Record<string, any> = {}
    const jsonCustomizationPayload: Record<string, any> = {}

    Object.entries(body).forEach(([key, value]) => {
      if (allowedJsonKeys.includes(key) && value !== undefined && value !== null && typeof value === 'object') {
        jsonCustomizationPayload[key] = value
        return
      }
      if (!allowedStringKeys.includes(key)) return
      if (typeof value === 'string') {
        updatePayload[key] = normalizeString(value)
      } else if (allowedNumericKeys.includes(key) && (typeof value === 'number' || (typeof value === 'string' && value !== ''))) {
        const numVal = Number(value)
        if (!Number.isNaN(numVal) && Number.isFinite(numVal)) {
          updatePayload[key] = numVal
        }
      }
    })

    if (updatePayload.email && typeof updatePayload.email === 'string' && !isValidEmail(updatePayload.email)) {
      return withCors(request, NextResponse.json({ error: 'Invalid school email address' }, { status: 400 }))
    }

    // Validate grading scales if provided
    if (Array.isArray(jsonCustomizationPayload.grading_scale)) {
      const check = validateGradingBands(jsonCustomizationPayload.grading_scale)
      if (!check.valid) {
        return withCors(request, NextResponse.json({ error: `Secular grading scale invalid: ${check.error}` }, { status: 400 }))
      }
    }
    if (Array.isArray(jsonCustomizationPayload.theology_grading_scale)) {
      const check = validateGradingBands(jsonCustomizationPayload.theology_grading_scale)
      if (!check.valid) {
        return withCors(request, NextResponse.json({ error: `Theology grading scale invalid: ${check.error}` }, { status: 400 }))
      }
    }

    // Normalize incoming aliases to actual database schema columns
    if (updatePayload.name && !updatePayload.school_name) {
      updatePayload.school_name = updatePayload.name
    }
    delete updatePayload.name

    if (updatePayload.phone && !updatePayload.phone_1) {
      updatePayload.phone_1 = updatePayload.phone
    }
    delete updatePayload.phone

    if (updatePayload.phone_1 && typeof updatePayload.phone_1 === 'string') {
      updatePayload.phone_1 = normalizePhone(updatePayload.phone_1)
    }

    if (Object.keys(updatePayload).length === 0 && Object.keys(jsonCustomizationPayload).length === 0) {
      return withCors(request, NextResponse.json({ error: 'No valid settings provided' }, { status: 400 }))
    }

    // 1. Update school_settings table if any scalar fields were sent
    if (Object.keys(updatePayload).length > 0) {
      const { data: existing } = await supabase.from('school_settings').select('id').limit(1).maybeSingle()
      const targetId = existing?.id || 'current'
      const fullRecord = { id: targetId, ...updatePayload, updated_at: new Date().toISOString() }
      const { error } = await supabase.from('school_settings').upsert([fullRecord], { onConflict: 'id' })

      if (error) {
        // Fallback if rehearsal schema only has base columns on school_settings
        const baseOnlyPayload: Record<string, any> = {}
        for (const col of baseDbColumns) {
          if (col in updatePayload) {
            baseOnlyPayload[col] = updatePayload[col]
          }
        }
        if (Object.keys(baseOnlyPayload).length > 0) {
          const fallbackRecord = { id: targetId, ...baseOnlyPayload, updated_at: new Date().toISOString() }
          const { error: fallbackError } = await supabase
            .from('school_settings')
            .upsert([fallbackRecord], { onConflict: 'id' })
          if (fallbackError) {
            console.error('settings/school PATCH error:', fallbackError.message)
            return withCors(request, NextResponse.json({ error: fallbackError.message }, { status: 500 }))
          }
        }
      }
    }

    // 2. Sync grading_scale to grading_criteria table if provided
    if (Array.isArray(jsonCustomizationPayload.grading_scale) && jsonCustomizationPayload.grading_scale.length > 0) {
      try {
        for (const rule of jsonCustomizationPayload.grading_scale) {
          if (rule && typeof rule.grade === 'string' && typeof rule.min === 'number' && typeof rule.max === 'number') {
            await supabase.from('grading_criteria').upsert(
              [
                {
                  id: rule.id || undefined,
                  curriculum: rule.curriculum || 'secular',
                  class_id: rule.class_id || null,
                  metric_type: rule.metric_type || 'subject_score',
                  min_value: Number(rule.min),
                  max_value: Number(rule.max),
                  output_type: 'grade_label',
                  output_text: String(rule.grade),
                },
              ],
              { onConflict: 'id' }
            )
          }
        }
      } catch {
        // Continue — full grading_scale is also persisted in school_customization_config
      }
    }

    if (Array.isArray(jsonCustomizationPayload.theology_grading_scale) && jsonCustomizationPayload.theology_grading_scale.length > 0) {
      try {
        for (const rule of jsonCustomizationPayload.theology_grading_scale) {
          if (rule && typeof rule.grade === 'string' && typeof rule.min === 'number' && typeof rule.max === 'number') {
            await supabase.from('grading_criteria').upsert(
              [
                {
                  id: rule.id || undefined,
                  curriculum: 'theology',
                  class_id: rule.class_id || null,
                  metric_type: rule.metric_type || 'subject_score',
                  min_value: Number(rule.min),
                  max_value: Number(rule.max),
                  output_type: 'grade_label',
                  output_text: String(rule.grade),
                },
              ],
              { onConflict: 'id' }
            )
          }
        }
      } catch {
        // Continue
      }
    }

    // 3. Merge and persist customization snapshot in activity_logs so extended fields, themes,
    // ranking preferences, grading scales, division boundaries, fee structure, and marks locks round-trip reliably
    const { data: prevConfigLogs } = await supabase
      .from('activity_logs')
      .select('details')
      .eq('action', 'school_customization_config')
      .order('created_at', { ascending: false })
      .limit(1)

    const prevConfig =
      prevConfigLogs && prevConfigLogs.length > 0 && prevConfigLogs[0]?.details && typeof prevConfigLogs[0].details === 'object'
        ? (prevConfigLogs[0].details as Record<string, any>)
        : {}

    const nextConfig = {
      ...prevConfig,
      ...updatePayload,
      ...jsonCustomizationPayload,
      updated_at: new Date().toISOString(),
    }

    await recordActivity(supabase, user.id, 'school_customization_config', nextConfig)
    await recordActivity(supabase, user.id, 'update_school_settings', {
      ...updatePayload,
      ...Object.keys(jsonCustomizationPayload).reduce((acc, k) => ({ ...acc, [k]: 'updated' }), {}),
    })

    return withCors(request, NextResponse.json({ success: true, data: nextConfig }))
  } catch (err: any) {
    console.error('settings/school PATCH exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
