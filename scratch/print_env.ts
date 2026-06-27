import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('Environment keys:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('PASS') || k.includes('SUPABASE') || k.includes('PORT') || k.includes('HOST')));
