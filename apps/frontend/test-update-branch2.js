const axios = require('axios');
async function test() {
  const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'superadmin@nkc.edu.in',
    password: 'SuperAdmin@2026!'
  });
  const token = login.data.accessToken;

  console.log('Testing branches update with new fields...');
  try {
    const res = await axios.patch('http://localhost:3001/api/v1/branches/1fcfd081-9637-458d-9a19-6dc2e9e483ce', {
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      managerName: 'Dr. Smith',
      isActive: true
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Branch updated:', res.data.city, res.data.managerName);
  } catch(e) {
    console.error('Update failed:', e.response?.status, e.response?.data);
  }
}
test();
