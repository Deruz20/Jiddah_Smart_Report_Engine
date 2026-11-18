import { createAdminClient, createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, isValidEmail, normalizePhone, normalizeString, recordActivity } from '@/lib/api-server'
import {
  fetchMergedSchoolSettings,
  invalidateSchoolSettingsCache,
  readLatestSchoolCustomizationConfig,
  SCHOOL_CUSTOMIZATION_ACTION,
  validateGradingBands,
} from '@/lib/school-settings-helper'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  'report_studio_config',
  'grading_scale',
  'theology_grading_scale',
  'theology_remarks',
  'print_preferences',
  'division_boundaries',
  'theology_division_boundaries',
  'fee_structure',
  'marks_locks',
  'promotion_comments',
  'hub_sections',
  'candidate_class_rules',
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
    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'manage_settings')) {
      return withCors(
        request,
        NextResponse.json({ error: 'Access Denied: Administrator only' }, { status: 403 })
      )
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    const { data: gradingCriteria, error: criteriaErr } = await supabaseAdmin
      .from('grading_criteria')
      .select('*')
      .order('max_value', { ascending: false })

    if (criteriaErr && criteriaErr.code !== '42P01') {
      console.error('settings/school grading_criteria error:', criteriaErr.message)
    }

    const merged = await fetchMergedSchoolSettings(supabaseAdmin, gradingCriteria || [])

    const formattedData = {
      ...merged,
      name: merged.school_name || merged.name || 'Jiddah Islamic Schools',
      school_name: merged.school_name || merged.name || 'Jiddah Islamic Schools',
      phone: merged.phone_1 || merged.phone || '',
      phone_1: merged.phone_1 || merged.phone || '',
      grading_criteria: gradingCriteria || [],
    }

    const response = NextResponse.json({ data: formattedData })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return withCors(request, response)
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

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return withCors(request, NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
    }

    const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'read')
    const bodyKeys = Object.keys(body)
    const isMarksLockOnly = bodyKeys.length === 1 && bodyKeys[0] === 'marks_locks'

    const isAllowed =
      authRes.isAuthorized &&
      (hasPermission(authRes, 'manage_settings') ||
        (isMarksLockOnly && hasPermission(authRes, 'lock_marks')))

    if (!isAllowed) {
      return withCors(
        request,
        NextResponse.json({ error: 'Access Denied: Insufficient permissions to modify school settings' }, { status: 403 })
      )
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

    // Validate grading scales & division boundaries if provided
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
    if (Array.isArray(jsonCustomizationPayload.division_boundaries)) {
      const { validateDivisionBoundaries } = await import('@/lib/school-settings-helper')
      const check = validateDivisionBoundaries(jsonCustomizationPayload.division_boundaries)
      if (!check.valid) {
        return withCors(request, NextResponse.json({ error: `Secular division boundaries invalid: ${check.error}` }, { status: 400 }))
      }
    }
    if (Array.isArray(jsonCustomizationPayload.theology_division_boundaries)) {
      const { validateDivisionBoundaries } = await import('@/lib/school-settings-helper')
      const check = validateDivisionBoundaries(jsonCustomizationPayload.theology_division_boundaries)
      if (!check.valid) {
        return withCors(request, NextResponse.json({ error: `Theology division boundaries invalid: ${check.error}` }, { status: 400 }))
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

    const supabaseAdmin = createAdminClient(cookieStore)

    // 1. Update school_settings table if any scalar fields were sent
    if (Object.keys(updatePayload).length > 0) {
      const { data: existing } = await supabaseAdmin.from('school_settings').select('id').limit(1).maybeSingle()
      const targetId = existing?.id || 'current'
      const fullRecord = { id: targetId, ...updatePayload, updated_at: new Date().toISOString() }
      const { error } = await supabaseAdmin.from('school_settings').upsert([fullRecord], { onConflict: 'id' })

      if (error) {
        // Fallback if schema only has base columns on school_settings
        const baseOnlyPayload: Record<string, any> = {}
        for (const col of baseDbColumns) {
          if (col in updatePayload) {
            baseOnlyPayload[col] = updatePayload[col]
          }
        }
        if (Object.keys(baseOnlyPayload).length > 0) {
          const fallbackRecord = { id: targetId, ...baseOnlyPayload, updated_at: new Date().toISOString() }
          const { error: fallbackError } = await supabaseAdmin
            .from('school_settings')
            .upsert([fallbackRecord], { onConflict: 'id' })
          if (fallbackError) {
            console.error('settings/school PATCH error:', fallbackError.message)
            return withCors(request, NextResponse.json({ error: fallbackError.message }, { status: 500 }))
          }
        }
      }
    }

    // 2. Merge and persist full customization snapshot cleanly in activity_logs.metadata
    const prevConfig = await readLatestSchoolCustomizationConfig(supabaseAdmin)
    const savedAt = new Date().toISOString()

    const nextConfig = {
      ...prevConfig,
      ...updatePayload,
      ...jsonCustomizationPayload,
      updated_at: savedAt,
    }

    const { error: saveConfigError } = await recordActivity(
      supabaseAdmin,
      user.id,
      SCHOOL_CUSTOMIZATION_ACTION,
      nextConfig
    )
    if (saveConfigError) {
      return withCors(
        request,
        NextResponse.json(
          { error: saveConfigError.message || 'Failed to persist school settings snapshot.' },
          { status: 500 }
        )
      )
    }

    await recordActivity(supabaseAdmin, user.id, 'update_school_settings', {
      ...updatePayload,
      ...Object.keys(jsonCustomizationPayload).reduce((acc, k) => ({ ...acc, [k]: 'updated' }), {}),
    })

    // 3. Mandatory read-back verification before reporting success
    invalidateSchoolSettingsCache()
    const { data: gradingCriteria } = await supabaseAdmin
      .from('grading_criteria')
      .select('*')
      .order('max_value', { ascending: false })

    const verifiedMerged = await fetchMergedSchoolSettings(supabaseAdmin, gradingCriteria || [])
    if ((verifiedMerged as any).updated_at !== savedAt) {
      return withCors(
        request,
        NextResponse.json(
          { error: 'Settings write did not verify cleanly on database read-back.' },
          { status: 500 }
        )
      )
    }

    const formattedData = {
      ...verifiedMerged,
      name: verifiedMerged.school_name || verifiedMerged.name || 'Jiddah Islamic Schools',
      school_name: verifiedMerged.school_name || verifiedMerged.name || 'Jiddah Islamic Schools',
      phone: verifiedMerged.phone_1 || verifiedMerged.phone || '',
      phone_1: verifiedMerged.phone_1 || verifiedMerged.phone || '',
      grading_criteria: gradingCriteria || [],
    }

    revalidatePath('/admin/settings')
    revalidatePath('/admin/reports')
    revalidatePath('/admin/secular-hub')
    revalidatePath('/admin/theology-hub')
    revalidatePath('/admin/marks')

    const response = NextResponse.json({ success: true, data: formattedData })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return withCors(request, response)
  } catch (err: any) {
    console.error('settings/school PATCH exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
