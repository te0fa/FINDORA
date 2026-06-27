import { Client } from 'pg';

async function addReviewerAcceptanceToken() {
    const client = new Client({
        connectionString: 'postgresql://postgres:123456@localhost:5432/postgres'
    });

    try {
        await client.connect();
        console.log('Connected to local database. Running ALTER TABLE requests...');
        const res = await client.query(`
            ALTER TABLE public.requests
            ADD COLUMN IF NOT EXISTS reviewer_acceptance_token text;
        `);
        console.log('ALTER TABLE complete:', res);
        await client.end();
    } catch (err: any) {
        console.error('Error running ALTER TABLE:', err.message);
    }
}

addReviewerAcceptanceToken();
