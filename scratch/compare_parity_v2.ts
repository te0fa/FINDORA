import * as fs from 'fs'

const migrationPath = 'e:/FINDORA/supabase/migrations/20260502010101_request_history_v7.sql'
const patchPath = 'e:/FINDORA/scratch/FIX_DB_SIGNAL_READY_MINIMAL.sql'

const migrationContent = fs.readFileSync(migrationPath, 'utf8')
const patchContent = fs.readFileSync(patchPath, 'utf8')

const migrationLines = migrationContent.split(/\r?\n/)
const patchLines = patchContent.split(/\r?\n/)

// The function in migration starts at line 216 (index 215) and ends at line 640 (index 639)
const originalFunctionLines = migrationLines.slice(215, 640).map(l => l.trim()).filter(l => l.length > 0)
const patchedFunctionLines = patchLines.map(l => l.trim()).filter(l => l.length > 0)

console.log('Original non-empty lines:', originalFunctionLines.length)
console.log('Patched non-empty lines:', patchedFunctionLines.length)

let origIdx = 0
let patchIdx = 0
let diffs = []

while (origIdx < originalFunctionLines.length) {
    const orig = originalFunctionLines[origIdx]
    const patch = patchedFunctionLines[patchIdx]

    if (orig === patch) {
        origIdx++
        patchIdx++
        continue
    }

    if (orig === 'AND is_active = true') {
        console.log('Found expected removal: "AND is_active = true"')
        origIdx++
        continue
    }

    diffs.push({
        orig,
        patch,
        origIdx,
        patchIdx
    })
    origIdx++
    patchIdx++
}

if (diffs.length === 0) {
    console.log('VERDICT: PARITY CONFIRMED (only removal found).')
} else {
    console.log('VERDICT: PARITY FAILED.')
    console.dir(diffs, { depth: null })
}
