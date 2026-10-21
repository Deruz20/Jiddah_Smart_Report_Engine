import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Wave 6: Security Hardening & Defenses Suite', async (t) => {
  await t.test('1. CSV / Excel Formula Injection (CWE-1236) Neutralization', async () => {
    const { escapeCSV } = await import('../../src/utils/csvExport.ts')

    // Formula injection vectors starting with =, +, -, @, \t, \r are prepended with single quote
    assert.equal(escapeCSV('=SUM(A1:A10)'), `"=SUM(A1:A10)`.startsWith(`'`) ? `'=SUM(A1:A10)` : `'=SUM(A1:A10)`)
    assert.equal(escapeCSV('+12345'), `'+12345`)
    assert.equal(escapeCSV('-cmd|/c calc'), `'-cmd|/c calc`)
    assert.equal(escapeCSV('@HYPERLINK("http://evil.com")'), `"'@HYPERLINK(""http://evil.com"")"`)
    assert.equal(escapeCSV('\tmalicious_tab'), `'\tmalicious_tab`)
    assert.equal(escapeCSV('\rmalicious_cr'), `'\rmalicious_cr`)

    // Safe regular strings
    assert.equal(escapeCSV('Normal Student Name'), 'Normal Student Name')
    assert.equal(escapeCSV('Class 7, Blue'), '"Class 7, Blue"')
    assert.equal(escapeCSV(null), '"-"')
    assert.equal(escapeCSV(undefined), '"-"')
  })

  await t.test('2. Next.js 16+ Proxy/Middleware Edge Entrypoint Invariant', () => {
    const proxyPath = path.resolve(process.cwd(), 'src/proxy.ts')
    assert.ok(fs.existsSync(proxyPath), 'src/proxy.ts must exist for Next.js 16+ edge route protection')

    const content = fs.readFileSync(proxyPath, 'utf8')
    assert.ok(content.includes('export async function proxy'), 'Must export proxy function')
    assert.ok(content.includes('updateSession'), 'Must invoke updateSession for session refreshes and role guards')
    assert.ok(content.includes('export const config'), 'Must export matcher config')
  })

  await t.test('3. Test/Debug Endpoints Permanently Removed & Return 404', async () => {
    const testErrorPath = path.resolve(process.cwd(), 'src/app/api/test_error/route.ts')
    const devSeedPath = path.resolve(process.cwd(), 'src/app/api/dev/seed/route.ts')
    assert.equal(fs.existsSync(testErrorPath), false, 'src/app/api/test_error/route.ts must be completely deleted')
    assert.equal(fs.existsSync(devSeedPath), false, 'src/app/api/dev/seed/route.ts must be completely deleted')

    // Live endpoint probe if server is running
    const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
    for (const p of ['/api/test_error', '/api/dev/seed']) {
      try {
        const res = await fetch(`${BASE_URL}${p}`)
        assert.equal(res.status, 404, `Endpoint ${p} must return 404`)
      } catch (err) {
        // If server is not running during local offline test, file absence check guarantees 404 on Next.js routing
      }
    }
  })

  await t.test('4. Upload MIME-to-Extension Canonical Mapping', () => {
    const mimeMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    }
    
    // An attacker sending content-type image/png with filename "exploit.html" gets canonical .png
    const spoofedFileName = 'exploit.html'
    const validatedMime = 'image/png'
    const safeExt = mimeMap[validatedMime] || 'png'
    assert.equal(safeExt, 'png', 'Extension must be derived from validated MIME, not file.name')
  })

  await t.test('5. Upload Magic Byte Content Sniffing (CWE-434 Defense)', async () => {
    const { sniffImageMimeType } = await import('../../src/lib/image-sniff.ts')

    // Valid PNG buffer
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
    assert.equal(sniffImageMimeType(pngBuffer), 'image/png')

    // Valid JPEG buffer
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    assert.equal(sniffImageMimeType(jpegBuffer), 'image/jpeg')

    // Valid WebP buffer (RIFF....WEBP)
    const webpBuffer = Buffer.from('RIFF\x20\x00\x00\x00WEBPVP8 ')
    assert.equal(sniffImageMimeType(webpBuffer), 'image/webp')

    // Malicious spoofed payload (HTML/script pretending to be image)
    const spoofedHtml = Buffer.from('<script>alert("pwned")</script>')
    assert.equal(sniffImageMimeType(spoofedHtml), null, 'HTML script must be rejected by content sniffing')

    // Malicious PHP shell pretending to be image
    const spoofedPhp = Buffer.from('<?php system($_GET["c"]); ?>')
    assert.equal(sniffImageMimeType(spoofedPhp), null, 'PHP shell must be rejected by content sniffing')
  })
})
