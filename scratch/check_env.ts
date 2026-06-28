import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
console.log('Environment keys:', Object.keys(process.env))
