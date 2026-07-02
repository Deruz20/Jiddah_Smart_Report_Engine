export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function sanitizeInput(input: string): string {
  if (!input) return input
  // Basic cleaning: trim, remove control characters, strip dangerous sequences
  let s = input.trim()
  s = s.replace(/\u0000/g, '')
  s = s.replace(/\.{2,}\//g, '') // remove ../ sequences
  s = s.replace(/[<>]/g, '')
  // Collapse multiple spaces
  s = s.replace(/\s{2,}/g, ' ')
  return s
}
