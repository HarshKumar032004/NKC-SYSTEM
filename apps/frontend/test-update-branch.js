const axios = require('axios');
async function test() {
  const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'superadmin@nkc.edu.in',
    password: 'SuperAdmin@2026!'
  });
  const token = login.data.accessToken;

  console.log('Testing branches update and delete endpoint...');
  try {
    const res = await axios.patch('http://localhost:3001/api/v1/branches/e046a9c3-75ca-455f-abb0-ffbed36e2146', {
      name: 'North Campus Updated',
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Branch updated:', res.data.name);

    const resDelete = await axios.delete('http://localhost:3001/api/v1/branches/e046a9c3-75ca-455f-abb0-ffbed36e2146', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Branch deleted (deactivated), isActive:', resDelete.data.isActive);
  } catch(e) {
    console.error('Action failed:', e.response?.status, e.response?.data);
  }
}
test();
