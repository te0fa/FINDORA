const { Client } = require('pg');

async function tryConnect(user, password, database = 'postgres') {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user,
    password,
    database
  });
  try {
    await client.connect();
    console.log(`Success: user=${user}, password=${password}, database=${database}`);
    const res = await client.query('SELECT version();');
    console.log('Version:', res.rows[0].version);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed: user=${user}, password=${password} - Error: ${err.message}`);
    return false;
  }
}

async function run() {
  const passwords = [
    '123456',
    'Password123',
    'postgres123',
    'mostafa',
    'nada',
    'findora',
    'foundora',
    'tradeora',
    'admin123',
    'root123'
  ];
  for (const password of passwords) {
    const success = await tryConnect('postgres', password);
    if (success) break;
  }
}
run();
