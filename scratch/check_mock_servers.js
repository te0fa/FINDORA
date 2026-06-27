async function check() {
  for (const port of [9013, 9014]) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { headers: { 'apikey': 'sb_publishable_415Qjb7VZ86-7123G6gsLw_tuWLQJm1' } });
      console.log(`Port ${port}: Status ${res.status}`);
      console.log(`Headers ${port}:`, JSON.stringify([...res.headers.entries()]));
      const text = await res.text();
      console.log(`Body ${port}:`, text.slice(0, 500));
    } catch (e) {
      console.log(`Port ${port} error:`, e.message);
    }
  }
}
check();
