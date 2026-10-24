import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sidePanel = await readFile(
  new URL('../components/figma-ui/SidePanel.tsx', import.meta.url),
  'utf8'
)

test('student report profile displays division and phase aggregates as aggregate values', () => {
  assert.match(sidePanel, /label="Division" value=\{circular\.division \?\? '—'\}/)
  assert.match(sidePanel, /label="BOT Aggregate" value=\{circular\.bot_aggregate \?\? '—'\}/)
  assert.match(sidePanel, /label="MOT Aggregate" value=\{circular\.mot_aggregate \?\? '—'\}/)
  assert.match(sidePanel, /label="EOT Aggregate" value=\{circular\.eot_aggregate \?\? '—'\}/)
  assert.doesNotMatch(sidePanel, /circular\.aggregate\}%/)
})
