const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres.knsjvttjkbdztxmtjxpz',
    password: '123456',
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected successfully to remote pooler!");
    
    // Check if columns already exist
    const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'merchant_quotes' AND column_name = 'ai_match_score';
    `);
    
    if (checkRes.rows.length > 0) {
      console.log("Migration already applied or columns exist.");
    } else {
      console.log("Applying migration...");
      await client.query(`
        ALTER TABLE public.merchant_quotes
        ADD COLUMN IF NOT EXISTS ai_match_score integer CHECK (ai_match_score BETWEEN 0 AND 100),
        ADD COLUMN IF NOT EXISTS ai_rating_stars numeric(3,2),
        ADD COLUMN IF NOT EXISTS ai_advantages_en text,
        ADD COLUMN IF NOT EXISTS ai_advantages_ar text,
        ADD COLUMN IF NOT EXISTS ai_verdict_en text,
        ADD COLUMN IF NOT EXISTS ai_verdict_ar text,
        ADD COLUMN IF NOT EXISTS ai_rank integer;

        ALTER TABLE public.report_option_snapshots
        ADD COLUMN IF NOT EXISTS disadvantages_en text,
        ADD COLUMN IF NOT EXISTS disadvantages_ar text;
      `);
      console.log("Migration applied successfully!");
    }
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

main();
