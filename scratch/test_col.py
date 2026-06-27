import os
env = {}
if os.path.exists('.env.local'):
    with open('.env.local') as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k.strip()] = v.strip().strip('"\'')

url = env.get('NEXT_PUBLIC_SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

from supabase import create_client
c = create_client(url, key)
try:
    res = c.table('service_pricing_versions').select('is_promo').limit(1).execute()
    print("SUCCESS! Column 'is_promo' EXISTS.")
except Exception as e:
    print("FAILED! Column 'is_promo' does NOT exist. Error:", e)
