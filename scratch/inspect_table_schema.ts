import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/dal/customers';

async function inspectSchema() {
    const db = await createAdminClient();
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SECRET_KEY}`;
    const res = await fetch(url);
    const spec = await res.json();
    const definition = spec.definitions?.merchants;
    if (definition) {
        console.log('Columns in merchants:', Object.keys(definition.properties));
    } else {
        console.log('Table definition not found in OpenAPI spec.');
    }
}

inspectSchema();
