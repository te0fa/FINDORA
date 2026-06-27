const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function main() {
  console.log("Checking columns on merchant_quotes...");
  const { data, error } = await supabase
    .from('merchant_quotes')
    .select('id, ai_match_score, ai_rating_stars, ai_advantages_en, ai_advantages_ar, ai_verdict_en, ai_verdict_ar, ai_rank')
    .limit(1);

  if (error) {
    console.error("merchant_quotes columns check failed:", error.message);
  } else {
    console.log("merchant_quotes columns exist!");
  }

  console.log("Checking columns on report_option_snapshots...");
  const { data: snapData, error: snapError } = await supabase
    .from('report_option_snapshots')
    .select('id, disadvantages_en, disadvantages_ar')
    .limit(1);

  if (snapError) {
    console.error("report_option_snapshots columns check failed:", snapError.message);
  } else {
    console.log("report_option_snapshots columns exist!");
  }
}

main();
