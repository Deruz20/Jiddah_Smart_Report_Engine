import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, isValidEmail, normalizePhone, normalizeString, recordActivity } from '@/lib/api-server'

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
  'print_preferences',
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

    const { verifyDataAccess } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: 'Access Denied' }, { status: 403 }))
    }

    const [
      { data: schoolRow, error },
      { data: configLogs },
      { data: gradingCriteria },
    ] = await Promise.all([
      supabase.from('school_settings').select('*').limit(1).maybeSingle(),
      supabase
        .from('activity_logs')
        .select('details')
        .eq('action', 'school_customization_config')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.from('grading_criteria').select('*').order('max_value', { ascending: false }),
    ])

    if (error) {
      console.error('settings/school GET error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    const persistedCustomization =
      configLogs && configLogs.length > 0 && configLogs[0]?.details && typeof configLogs[0].details === 'object'
        ? (configLogs[0].details as Record<string, any>)
        : {}

    const merged = {
      ...(schoolRow || {}),
      ...persistedCustomization,
      ...(schoolRow?.school_name ? { school_name: schoolRow.school_name } : {}),
      ...(schoolRow?.address ? { address: schoolRow.address } : {}),
      ...(schoolRow?.district ? { district: schoolRow.district } : {}),
      ...(schoolRow?.email ? { email: schoolRow.email } : {}),
      ...(schoolRow?.phone_1 ? { phone_1: schoolRow.phone_1 } : {}),
    }

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
    if (
      !authRes.isAuthorized ||
      (authRes.role !== 'Administrator' && authRes.role !== 'admin' && authRes.role !== 'Head Teacher')
    ) {
      return withCors(request, NextResponse.json({ error: 'Access Denied: Administrator only' }, { status: 403 }))
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

    // 3. Merge and persist customization snapshot in activity_logs so extended fields, themes,
    // ranking preferences, grading scales, and report template overlays round-trip reliably
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
