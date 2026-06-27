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
    console.log(`Failed: user=${user}, password=${password}, database=${database} - Error: ${err.message}`);
    return false;
  }
}

async function run() {
  const combos = [
    { user: 'postgres', password: '' },
    { user: 'postgres', password: 'password' },
    { user: 'postgres', password: 'postgres' },
    { user: 'postgres', password: 'admin' },
    { user: 'postgres', password: 'root' },
  ];
  for (const combo of combos) {
    const success = await tryConnect(combo.user, combo.password);
    if (success) break;
  }
}
run();
