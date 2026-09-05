const axios = require('axios');
async function test() {
  const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'superadmin@nkc.edu.in',
    password: 'SuperAdmin@2026!'
  });
  const token = login.data.accessToken;

  console.log('Testing branches endpoint...');
  try {
    const res = await axios.get('http://localhost:3001/api/v1/branches', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Branches fetched:', res.data.length);
    console.log('Sample:', res.data[0]);
  } catch(e) {
    console.error('Fetch failed:', e.response?.status, e.response?.data);
  }
}
test();
