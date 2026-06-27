require('dotenv').config({ path: '.env.local' })

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY")
    return
  }

  console.log("Fetching OpenAPI spec...")
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  })

  if (!res.ok) {
    console.error("Failed to fetch:", res.status, res.statusText)
    return
  }

  const spec = await res.json()
  const paths = Object.keys(spec.paths || {})
  
  console.log("=== All available OpenAPI paths ===")
  paths.forEach(p => {
    console.log(p)
  })
}

run().catch(console.error)
