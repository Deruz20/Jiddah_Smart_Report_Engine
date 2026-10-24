import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'
import { verifyDataAccess } from '@/lib/auth-server'

const BUCKET = 'signatures'

import {
  getDynamicSignatureSlots,
  getLatestSignatureObjectNameForSlot,
  getSignatureObjectNamesForSlot,
  setSignatureObjectActiveState,
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
    const storage = admin.storage.from(BUCKET)
    const [activeResult, disabledResult] = await Promise.all([
      storage.list('', { limit: 1000 }),
      storage.list('disabled', { limit: 1000 }),
    ])
    if (activeResult.error || disabledResult.error) {
      const message = activeResult.error?.message ?? disabledResult.error?.message ?? 'Unable to list report images.'
      console.error('signatures GET list error:', message)
      return withCors(request, NextResponse.json({ error: message }, { status: 500 }))
    }

    const slots = SIGNATURE_SLOTS.map((slot) => {
      const activeFile = getLatestSignatureObjectNameForSlot(activeResult.data ?? [], slot.slot_key)
      const disabledFile = getLatestSignatureObjectNameForSlot(disabledResult.data ?? [], slot.slot_key)
      const file = activeFile
        ? activeResult.data?.find((object) => object.name === activeFile)
        : null
      const url = file ? buildPublicUrl(admin, file.name) : null
      const public_url = url ? withSignatureVersion(url, file?.updated_at) : null
      return {
        ...slot,
        public_url,
        uploaded: Boolean(activeFile || disabledFile),
        active: Boolean(activeFile),
        size: Number(file?.metadata?.size ?? file?.metadata?.contentLength ?? 0),
      }
    })

    return withCors(request, NextResponse.json({ data: slots }, {
      headers: { 'Cache-Control': 'no-store' },
    }))
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
    if (!body || typeof body !== 'object' || typeof body.slot_key !== 'string' || typeof body.active !== 'boolean') {
      return withCors(request, NextResponse.json({ error: 'A slot key and active boolean are required.' }, { status: 400 }))
    }

    const admin = createAdminClient()
    const SIGNATURE_SLOTS = await getDynamicSignatureSlots(admin)
    const slotExists = SIGNATURE_SLOTS.some((slot) => slot.slot_key === body.slot_key)
    if (!slotExists) {
      return withCors(request, NextResponse.json({ error: 'Unknown signature slot' }, { status: 400 }))
    }

    const result = await setSignatureObjectActiveState(
      admin.storage.from(BUCKET),
      body.slot_key,
      body.active
    )
    if (result.error) {
      console.error('signatures PATCH state change error:', result.error)
      return withCors(request, NextResponse.json({ error: result.error }, { status: result.status ?? 500 }))
    }

    await recordActivity(supabase, user.id, 'update_signature_slot', {
      slot_key: body.slot_key,
      active: body.active,
    })
    return withCors(request, NextResponse.json({
      data: { slot_key: body.slot_key, active: body.active },
    }))
  } catch (err: any) {
    console.error('signatures PATCH exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function DELETE(request: NextRequest) {
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
      return withCors(request, NextResponse.json({ error: 'Only administrators may remove official signatures.' }, { status: 403 }))
    }

    const body = await request.json()
    if (!body || typeof body !== 'object' || typeof body.slot_key !== 'string') {
      return withCors(request, NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
    }

    const admin = createAdminClient()
    const signatureSlots = await getDynamicSignatureSlots(admin)
    if (!signatureSlots.some((slot) => slot.slot_key === body.slot_key)) {
      return withCors(request, NextResponse.json({ error: 'Unknown signature slot' }, { status: 400 }))
    }

    const storage = admin.storage.from(BUCKET)
    const { data: objects, error: listError } = await storage.list('', { limit: 1000 })
    if (listError) {
      console.error('signatures DELETE list error:', listError.message)
      return withCors(request, NextResponse.json({ error: listError.message }, { status: 500 }))
    }

    const { data: disabledObjects, error: disabledListError } = await storage.list('disabled', { limit: 1000 })
    if (disabledListError) {
      console.error('signatures DELETE disabled-list error:', disabledListError.message)
      return withCors(request, NextResponse.json({ error: disabledListError.message }, { status: 500 }))
    }

    const paths = [
      ...getSignatureObjectNamesForSlot(objects ?? [], body.slot_key),
      ...getSignatureObjectNamesForSlot(disabledObjects ?? [], body.slot_key)
        .map((path) => `disabled/${path}`),
    ]
    if (paths.length > 0) {
      const { error: removeError } = await storage.remove(paths)
      if (removeError) {
        console.error('signatures DELETE remove error:', removeError.message)
        return withCors(request, NextResponse.json({ error: removeError.message }, { status: 500 }))
      }
    }

    await recordActivity(supabase, user.id, 'remove_signature', {
      slot_key: body.slot_key,
      removed_files: paths.length,
    })

    return withCors(request, NextResponse.json({
      data: { slot_key: body.slot_key, removed: paths.length },
    }))
  } catch (err: any) {
    console.error('signatures DELETE exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
