const BASE_URL = 'http://localhost:3000'

async function checkLocaleInjection() {
  console.log('Sending request to /zz/dashboard with redirect manual...')
  const resManual = await fetch(`${BASE_URL}/zz/dashboard`, { redirect: 'manual' })
  console.log(`Manual Redirect status: ${resManual.status}`)
  console.log(`Manual Redirect Location header: ${resManual.headers.get('location')}`)

  console.log('\nSending request to /zz/dashboard with redirect follow...')
  const resFollow = await fetch(`${BASE_URL}/zz/dashboard`, { redirect: 'follow' })
  console.log(`Follow status: ${resFollow.status}`)
  console.log(`Follow final URL: ${resFollow.url}`)
}

checkLocaleInjection().catch(console.error)
