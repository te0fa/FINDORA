const path = require('path');
const http = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const reqUrl = `${url}/rest/v1/?apikey=${key}`;

console.log('Fetching OpenAPI schema from PostgREST...');
http.get(reqUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const schema = JSON.parse(data);
      const paths = Object.keys(schema.paths || {});
      const rpcs = paths.filter(p => p.startsWith('/rpc/'));
      console.log('Available RPC paths:');
      if (rpcs.length === 0) {
        console.log('  None found.');
      } else {
        rpcs.forEach(p => console.log(`  ${p}`));
      }
    } catch (err) {
      console.error('Failed to parse OpenAPI schema:', err.message);
      console.log('Response content:', data.slice(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
});
