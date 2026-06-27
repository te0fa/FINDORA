async function probe(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`, { method: 'GET' });
    console.log(`Port ${port} is active, status: ${res.status}`);
    const text = await res.text();
    console.log(`Response from ${port}:`, text.slice(0, 150));
  } catch (err) {
    console.log(`Port ${port} failed:`, err.message);
  }
}

async function run() {
  const ports = [7778, 6850, 9012, 9013, 9014, 12177, 54321];
  for (const port of ports) {
    await probe(port);
  }
}
run();
