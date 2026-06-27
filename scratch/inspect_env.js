require('dotenv').config({ path: '.env.local' });
console.log("Environment keys:", Object.keys(process.env).filter(k => k.includes("DB") || k.includes("DATABASE") || k.includes("POSTGRES") || k.includes("PASS") || k.includes("URL") || k.includes("KEY")));
