const axios = require('axios');
async function test() {
  const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'superadmin@nkc.edu.in',
    password: 'SuperAdmin@2026!'
  });
  const token = login.data.accessToken;

  console.log('Testing branches creation endpoint...');
  try {
    const res = await axios.post('http://localhost:3001/api/v1/branches', {
      name: 'North Campus',
      code: 'NKC-NORTH',
      address: '456 North Rd',
      contactPhone: '9876543210',
      email: 'north@nkc.edu.in',
      isActive: true
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Branch created:', res.data);
  } catch(e) {
    console.error('Create failed:', e.response?.status, e.response?.data);
  }
}
test();
