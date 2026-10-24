import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'
import { verifyDataAccess } from '@/lib/auth-server'

const BUCKET = 'signatures'

import {
  getDynamicSignatureSlots,
  mapLatestSignatureObjects,
  withSignatureVersion,
} from '@/utils/signatures'

function buildPublicUrl(supabase: ReturnType<typeof createClient>, filePath: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data?.publicUrl ?? null
}

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

    const access = await verifyDataAccess(supabase, user, 'read')
    if (!access.isAuthorized || access.canonicalRole !== 'Administrator') {
      return withCors(request, NextResponse.json({ error: 'Only administrators may manage official signatures.' }, { status: 403 }))
    }

    const admin = createAdminClient()
    const SIGNATURE_SLOTS = await getDynamicSignatureSlots(admin)
    const { data: objects, error } = await admin.storage.from(BUCKET).list('', { limit: 1000 })
    if (error) {
      console.error('signatures GET list error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    const uploadedBySlot = mapLatestSignatureObjects(
      objects ?? [],
      SIGNATURE_SLOTS.map((slot) => slot.slot_key)
    )

    const slots = SIGNATURE_SLOTS.map((slot) => {
      const file = uploadedBySlot.get(slot.slot_key)
      const url = file ? buildPublicUrl(admin, file.name) : null
      const public_url = url ? withSignatureVersion(url, file?.updated_at) : null
      return {
        ...slot,
        public_url,
        uploaded: Boolean(public_url),
        size: Number(file?.metadata?.size ?? file?.metadata?.contentLength ?? 0),
      }
    })

    return withCors(request, NextResponse.json({ data: slots }))
  } catch (err: any) {
    console.error('signatures GET exception:', err)
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

    const access = await verifyDataAccess(supabase, user, 'write')
    if (!access.isAuthorized || access.canonicalRole !== 'Administrator') {
      return withCors(request, NextResponse.json({ error: 'Only administrators may manage official signatures.' }, { status: 403 }))
    }

    const body = await request.json()
    if (!body || typeof body !== 'object' || typeof body.slot_key !== 'string') {
      return withCors(request, NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
    }

    const SIGNATURE_SLOTS = await getDynamicSignatureSlots(createAdminClient())
    const slotExists = SIGNATURE_SLOTS.some((slot) => slot.slot_key === body.slot_key)
    if (!slotExists) {
      return withCors(request, NextResponse.json({ error: 'Unknown signature slot' }, { status: 400 }))
    }

    await recordActivity(supabase, user.id, 'update_signature_slot', { slot_key: body.slot_key, payload: body })
    return withCors(request, NextResponse.json({ data: { success: true } }))
  } catch (err: any) {
    console.error('signatures PATCH exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
