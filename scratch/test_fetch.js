async function test() {
  try {
    const res = await fetch('https://knsjvttjkbdztxmtjxpz.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'sb_publishable_415Qjb7VZ86-7123G6gsLw_tuWLQJm1'
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 200));
  } catch (err) {
    console.error('Fetch failed with error:', err);
  }
}
test();
