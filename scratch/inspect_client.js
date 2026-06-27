console.log('PG env vars in process.env before delete:');
for (const key of Object.keys(process.env)) {
  if (key.startsWith('PG') || key.includes('DATABASE') || key.includes('DB')) {
    console.log(`  ${key} = ${process.env[key]}`);
  }
}

// Delete them
for (const key of Object.keys(process.env)) {
  if (key.startsWith('PG')) {
    delete process.env[key];
  }
}

const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.knsjvttjkbdztxmtjxpz',
  password: '123456',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

console.log('Client options after instantiation:');
console.log('  host:', client.connectionParameters.host);
console.log('  port:', client.connectionParameters.port);
console.log('  user:', client.connectionParameters.user);
console.log('  database:', client.connectionParameters.database);
console.log('  password:', client.connectionParameters.password ? 'present' : 'absent');
