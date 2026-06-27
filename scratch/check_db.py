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
# Get table column info
res = c.rpc('get_table_columns', {'table_name': 'service_pricing_versions'}).execute()
print("RPC columns:", res.data)
