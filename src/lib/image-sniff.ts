/**
 * Content Sniffing Utility for Upload Security
 * Validates magic bytes independently of client-supplied MIME headers (CWE-434).
 */

export type SupportedImageType = 'image/png' | 'image/jpeg' | 'image/webp';

export function sniffImageMimeType(buffer: Buffer): SupportedImageType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG Magic Bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // WebP Magic Bytes: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'image/webp';
  }

  return null;
}
