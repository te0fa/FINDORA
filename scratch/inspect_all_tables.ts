import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectAllTables() {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SECRET_KEY}`;
    
    try {
        console.log('Fetching OpenAPI spec from Supabase Rest URL...');
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        
        const spec = await res.json();
        const tables = Object.keys(spec.definitions || {});
        
        console.log(`\nFound ${tables.length} tables/views in the remote Supabase API schema cache:\n`);
        tables.sort().forEach(table => {
            const columns = Object.keys(spec.definitions[table].properties || {});
            console.log(`- **${table}** (${columns.length} columns)`);
            // console.log(`  Columns: ${columns.join(', ')}`);
        });

        // Let's also check if we can list migration files
        console.log('\n--- Checking Migration Files in supabase/migrations/ ---');
        // We will output the list of tables to compare
    } catch (err: any) {
        console.error('Error during inspection:', err.message);
    }
}

inspectAllTables();
