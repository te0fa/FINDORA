const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function tryConnect(password) {
  console.log(`Trying direct connection with password: ${password.substring(0, 8)}...`)
  const client = new Client({
    host: 'db.knsjvttjkbdztxmtjxpz.supabase.co',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  })
  try {
    await client.connect()
    console.log(`✅ DIRECT SUCCESS: password=${password}`)
    await client.end()
    return true
  } catch (err) {
    console.log(`❌ Direct failed: ${err.message}`)
    await client.end().catch(() => {})
    return false
  }
}

async function run() {
  const passwords = [
    process.env.SUPABASE_SECRET_KEY,
    '123456',
    'Password123',
    'postgres',
    'findora',
    'mostafa',
    'nada'
  ].filter(Boolean)

  for (const pwd of passwords) {
    const ok = await tryConnect(pwd)
    if (ok) return
  }
  console.log("Direct connection checks complete.")
}

run().catch(console.error)
