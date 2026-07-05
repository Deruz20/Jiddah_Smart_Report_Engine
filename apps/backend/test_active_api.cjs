async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/settings/terms/active');
    console.log('Status:', res.status);
    const body = await res.json();
    console.log('Body:', body);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
