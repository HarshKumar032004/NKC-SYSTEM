const axios = require('axios');
async function test() {
  const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'superadmin@nkc.edu.in',
    password: 'SuperAdmin@2026!'
  });
  const token = login.data.accessToken;
  const branchId = login.data.user.branchId;

  console.log('Token:', token ? 'OK' : 'MISSING');
  
  try {
    const res = await axios.get(`http://localhost:3001/api/v1/students?branchId=${branchId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Students fetched:', res.data.length);
  } catch(e) {
    console.error('Fetch failed:', e.response?.status, e.response?.data);
  }
}
test();
