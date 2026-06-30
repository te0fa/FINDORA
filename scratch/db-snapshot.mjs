/**
 * Diagnostic script — reads current requests table state before altering source_type constraint.
 * Run with: node --env-file=.env.local scratch/db-snapshot.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

console.log('─── DB Snapshot: requests.source_type ───────────────────')

// 1. Total row count
const { count: total } = await supabase
  .from('requests')
  .select('*', { count: 'exact', head: true })
console.log(`Total rows in requests: ${total}`)

// 2. Distinct source_type values + counts
const { data: rows, error } = await supabase
  .rpc('pg_query_source_type_counts')
  .select('*')

// Since we can't run arbitrary SQL, use group-by workaround:
const { data: allSourceTypes, error: stErr } = await supabase
  .from('requests')
  .select('source_type')
  .limit(10000)

if (stErr) {
  console.error('Error reading source_type values:', stErr.message)
} else {
  const counts = {}
  for (const row of (allSourceTypes ?? [])) {
    const v = row.source_type ?? 'NULL'
    counts[v] = (counts[v] ?? 0) + 1
  }
  console.log('\nDistinct source_type values (value → count):')
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`)
  }
}

// 3. Check if constraint exists
const { data: constraintRows, error: cErr } = await supabase
  .from('information_schema.constraint_column_usage')
  .select('constraint_name')
  .eq('table_name', 'requests')
  .eq('constraint_name', 'ck_requests_source_type')

// Actually use a direct REST check via rpc or a simpler table:
console.log('\n─── Checking existing CHECK constraint ───────────────────')
const { data: pgConstraints, error: pgErr } = await supabase
  .from('pg_constraint')
  .select('conname, consrc')
  .eq('conname', 'ck_requests_source_type')
  .limit(1)

if (pgErr) {
  // pg_constraint is not exposed via REST — that's expected
  console.log('(Cannot query pg_constraint via REST — will check via migration logic instead)')
} else {
  console.log('Constraint rows:', pgConstraints)
}

console.log('\n─── Snapshot complete ────────────────────────────────────')
