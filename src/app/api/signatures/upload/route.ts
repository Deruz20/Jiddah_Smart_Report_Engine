import { createClient, createAdminClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'
import { verifyDataAccess } from '@/lib/auth-server'

import {
  getDynamicSignatureSlots,
  getSignatureObjectNamesForSlot,
  resolveAllowedSignatureSlotsForUser,
  withSignatureVersion,
} from '@/utils/signatures'
import { sniffImageMimeType } from '@/lib/image-sniff'
import { createTransparentSignaturePng } from '@/lib/signature-image'
const BUCKET = 'signatures'
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit (>= 5MB) to accommodate mobile phone camera uploads

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function POST(request: NextRequest) {
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
    if (!access.isAuthorized) {
      return withCors(request, NextResponse.json({ error: access.message || 'Forbidden' }, { status: 403 }))
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const slotKey = formData.get('slot_key')

    if (!(file instanceof File)) {
      return withCors(request, NextResponse.json({ error: 'No file provided' }, { status: 400 }))
    }

    if (!slotKey || typeof slotKey !== 'string') {
      return withCors(request, NextResponse.json({ error: 'Slot key is required' }, { status: 400 }))
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    const allowedSlots = await resolveAllowedSignatureSlotsForUser(supabaseAdmin, access)
    if (allowedSlots !== null && !allowedSlots.has(slotKey)) {
      return withCors(
        request,
        NextResponse.json(
          { error: 'Forbidden: You may only upload or replace signatures for your own assigned role or class.' },
          { status: 403 }
        )
      )
    }

    const SIGNATURE_SLOTS = await getDynamicSignatureSlots(supabaseAdmin)
    const isValidSlot =
      SIGNATURE_SLOTS.some((slot) => slot.slot_key === slotKey) ||
      slotKey === 'school-logo' ||
      (allowedSlots !== null && allowedSlots.has(slotKey))
    if (!isValidSlot) {
      return withCors(request, NextResponse.json({ error: 'Invalid signature slot' }, { status: 400 }))
    }

    const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
    if (normalizedType && !ACCEPTED_TYPES.includes(normalizedType)) {
      return withCors(request, NextResponse.json({ error: 'Unsupported file type. Use PNG, JPG, or WEBP' }, { status: 400 }))
    }

    if (file.size > MAX_FILE_SIZE) {
      return withCors(request, NextResponse.json({ error: 'File must be smaller than 10MB' }, { status: 400 }))
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Content Sniffing: Verify genuine image magic bytes (CWE-434 defense)
    const sniffedMime = sniffImageMimeType(buffer)
    if (!sniffedMime || !ACCEPTED_TYPES.includes(sniffedMime)) {
      return withCors(request, NextResponse.json({ error: 'File content verification failed: not a valid PNG, JPG, or WEBP image' }, { status: 400 }))
    }

    let transparentPng: Buffer
    try {
      transparentPng = await createTransparentSignaturePng(buffer)
    } catch (error) {
      console.error('Signature image could not be decoded or processed:', error)
      return withCors(request, NextResponse.json({ error: 'The image could not be processed. Please upload a valid image.' }, { status: 400 }))
    }

    if (transparentPng.length > MAX_FILE_SIZE) {
      return withCors(request, NextResponse.json({ error: 'Processed image is too large. Please upload a smaller image.' }, { status: 400 }))
    }

    const filePath = `${slotKey}.png`

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(filePath, transparentPng, {
      upsert: true,
      cacheControl: '0',
      contentType: 'image/png'
    })

    if (uploadError) {
      return withCors(request, NextResponse.json({ error: uploadError.message }, { status: 500 }))
    }

    const storage = supabaseAdmin.storage.from(BUCKET)
    const { data: disabledObjects } = await storage.list('disabled', { limit: 1000 })
    const disabledPaths = getSignatureObjectNamesForSlot(disabledObjects ?? [], slotKey)
      .map((name) => `disabled/${name}`)
    if (disabledPaths.length > 0) {
      await storage.remove(disabledPaths)
    }

    const { data: objects, error: listError } = await storage.list('', { limit: 1000 })
    if (listError) {
      console.error('Uploaded signature could not be verified:', listError.message)
      return withCors(request, NextResponse.json({ error: 'Upload completed but the stored signature could not be verified.' }, { status: 500 }))
    }

    const selectedFile = (objects ?? []).find((object) => object.name === filePath)
    if (!selectedFile) {
      return withCors(request, NextResponse.json({ error: 'Uploaded signature could not be verified as the current slot image.' }, { status: 500 }))
    }

    const stalePaths = (objects ?? [])
      .filter((object) => object.name.startsWith(`${slotKey}.`) && object.name !== filePath)
      .map((object) => object.name)
    if (stalePaths.length > 0) {
      await storage.remove(stalePaths)
    }

    const publicUrl = storage.getPublicUrl(filePath).data?.publicUrl ?? null
    const public_url = publicUrl
      ? withSignatureVersion(publicUrl, selectedFile.updated_at)
      : null

    if (!public_url) {
      return withCors(request, NextResponse.json({ error: 'Failed to generate signature URL' }, { status: 500 }))
    }

    await recordActivity(supabase, user.id, 'upload_signature', { slot_key: slotKey, file_path: filePath })
    return withCors(request, NextResponse.json({
      data: { slot_key: slotKey, public_url, size: transparentPng.length },
    }))
  } catch (err: any) {
    console.error('signatures/upload POST exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
