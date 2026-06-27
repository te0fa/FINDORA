import * as fs from 'fs'

const migrationPath = 'e:/FINDORA/supabase/migrations/20260502010101_request_history_v7.sql'
const patchPath = 'e:/FINDORA/scratch/FIX_DB_SIGNAL_READY_MINIMAL.sql'

const migrationLines = fs.readFileSync(migrationPath, 'utf8').split('\n')
const patchLines = fs.readFileSync(patchPath, 'utf8').split('\n')

// The function in migration starts at line 216 (index 215) and ends at line 640 (index 639)
const originalFunctionLines = migrationLines.slice(215, 640).map(l => l.trim())
const patchedFunctionLines = patchLines.map(l => l.trim()).filter(l => l.length > 0)

console.log('Original lines count:', originalFunctionLines.length)
console.log('Patched lines count:', patchedFunctionLines.length)

let differences = []

// We expect one line to be removed, so the counts should differ by 1 or so depending on whitespace
// Actually, let's just find the differences

let origIdx = 0
let patchIdx = 0

while (origIdx < originalFunctionLines.length && patchIdx < patchedFunctionLines.length) {
  const orig = originalFunctionLines[origIdx]
  const patch = patchedFunctionLines[patchIdx]

  if (orig === patch) {
    origIdx++
    patchIdx++
    continue
  }

  // Check if it's the expected removal
  if (orig === 'AND is_active = true') {
    console.log(`Found expected removal at migration line ${origIdx + 216}: "${orig}"`)
    origIdx++
    continue
  }

  differences.push({
    migrationLine: origIdx + 216,
    patchLine: patchIdx + 1,
    original: orig,
    patched: patch
  })
  origIdx++
  patchIdx++
}

if (differences.length === 0) {
  console.log('SUCCESS: No unexpected differences found.')
} else {
  console.log('DIFFERENCES FOUND:')
  console.dir(differences, { depth: null })
}
