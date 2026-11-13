import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'
import { verifyDataAccess } from '@/lib/auth-server'

import {
  deleteSignatureSlotObject,
  getDynamicSignatureSlots,
  getLatestSignatureObjectNameForSlot,
  setSignatureObjectActiveState,
} from '@/utils/signatures'

const BUCKET = 'signatures'

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
      return withCors(request, NextResponse.json({ error: 'Only administrators may manage official report images.' }, { status: 403 }))
    }

    const admin = createAdminClient(cookieStore)
    const storage = admin.storage.from(BUCKET)
    let activeFiles: any[] = []
    let disabledFiles: any[] = []

    try {
      const [activeResult, disabledResult] = await Promise.all([
        storage.list('', { limit: 1000 }),
        storage.list('disabled', { limit: 1000 }),
      ])
      if (!activeResult.error && activeResult.data) {
        activeFiles = activeResult.data
      } else if (activeResult.error) {
        console.warn('signatures active list warning (bucket may be uninitialized):', activeResult.error.message)
      }
      if (!disabledResult.error && disabledResult.data) {
        disabledFiles = disabledResult.data
      } else if (disabledResult.error) {
        console.warn('signatures disabled list warning (bucket may be uninitialized):', disabledResult.error.message)
      }
    } catch (e: any) {
      console.warn('signatures storage list exception (bucket may be uninitialized):', e?.message)
    }

    const SIGNATURE_SLOTS = await getDynamicSignatureSlots(admin)

    const activeBySlot = new Map<string, string>()
    const disabledBySlot = new Map<string, string>()
    for (const slot of SIGNATURE_SLOTS) {
      const activePath = getLatestSignatureObjectNameForSlot(activeFiles, slot.slot_key)
      const disabledPath = getLatestSignatureObjectNameForSlot(disabledFiles, slot.slot_key)
      if (activePath) activeBySlot.set(slot.slot_key, activePath)
      if (disabledPath) disabledBySlot.set(slot.slot_key, disabledPath)
    }

    const slots = SIGNATURE_SLOTS.map((slot) => {
      const activePath = activeBySlot.get(slot.slot_key)
      const disabledPath = disabledBySlot.get(slot.slot_key)
      const public_url = activePath ? buildPublicUrl(admin, activePath) : null
      return {
        ...slot,
        public_url,
        uploaded: Boolean(activePath || disabledPath),
        active: Boolean(activePath),
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
      return withCors(request, NextResponse.json({ error: 'Only administrators may manage official report images.' }, { status: 403 }))
    }

    const body = await request.json()
    if (!body || typeof body !== 'object' || typeof body.slot_key !== 'string' || typeof body.active !== 'boolean') {
      return withCors(request, NextResponse.json({ error: 'A slot key and active boolean are required.' }, { status: 400 }))
    }

    const admin = createAdminClient(cookieStore)
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
      return withCors(request, NextResponse.json({ error: 'Only administrators may remove official report images.' }, { status: 403 }))
    }

    let slotKey: string | null = null
    const { searchParams } = new URL(request.url)
    slotKey = searchParams.get('slot_key')

    if (!slotKey) {
      try {
        const body = await request.json()
        if (body && typeof body.slot_key === 'string') {
          slotKey = body.slot_key
        }
      } catch {}
    }

    if (!slotKey) {
      return withCors(request, NextResponse.json({ error: 'A valid slot_key is required.' }, { status: 400 }))
    }

    const admin = createAdminClient(cookieStore)
    const result = await deleteSignatureSlotObject(admin.storage.from(BUCKET), slotKey)
    if (result.error) {
      console.error('signatures DELETE error:', result.error)
      return withCors(request, NextResponse.json({ error: result.error }, { status: result.status ?? 500 }))
    }

    await recordActivity(supabase, user.id, 'delete_signature_slot', {
      slot_key: slotKey,
    })

    return withCors(request, NextResponse.json({
      success: true,
      data: { slot_key: slotKey },
    }))
  } catch (err: any) {
    console.error('signatures DELETE exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
