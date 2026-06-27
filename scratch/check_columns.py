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
# query information_schema.columns
res = c.postgrest.rpc('get_table_columns', {}).execute() if False else None
# Let's query information_schema.columns via standard rest endpoint if possible, but actually we can just fetch via HTTP REST API or use a sql function if any.
# Let's do a simple select on information_schema via a trick or check what we can.
# Wait! We can check using another python script that runs a query.
