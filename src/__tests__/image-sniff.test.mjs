import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sniffImageMimeType } from '../lib/image-sniff.ts'

test('signature uploads accept only known PNG, JPEG, and WEBP file signatures', () => {
  assert.equal(sniffImageMimeType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
  assert.equal(sniffImageMimeType(Uint8Array.from([0xff, 0xd8, 0xff])), 'image/jpeg')
  assert.equal(sniffImageMimeType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), 'image/webp')
  assert.equal(sniffImageMimeType(Uint8Array.from([0x47, 0x49, 0x46, 0x38])), null)
})
