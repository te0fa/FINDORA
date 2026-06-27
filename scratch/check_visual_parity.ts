import * as fs from 'fs'

const migrationPath = 'e:/FINDORA/supabase/migrations/20260502010101_request_history_v7.sql'
const patchPath = 'e:/FINDORA/scratch/FIX_DB_SIGNAL_READY_MINIMAL.sql'

const migrationLines = fs.readFileSync(migrationPath, 'utf8').split('\n')
const patchLines = fs.readFileSync(patchPath, 'utf8').split('\n')

console.log('--- MIGRATION (from 216) ---')
console.log(migrationLines.slice(215, 235).join('\n'))

console.log('--- PATCH ---')
console.log(patchLines.slice(0, 20).join('\n'))
