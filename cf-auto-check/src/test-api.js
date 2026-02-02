require('dotenv').config();
const axios = require('axios');

async function testAPI() {
  const apiUrl = process.env.API_URL;
  const apiKey = process.env.API_KEY;

  console.log('Testing API Connection...');
  console.log('API URL:', apiUrl);
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');
  console.log('');

  // Test 1: Basic connectivity
  console.log('Test 1: Testing basic connectivity...');
  try {
    const response = await axios.get(apiUrl, { timeout: 10000 });
    console.log('✓ Basic connectivity OK');
    console.log('  Status:', response.status);
  } catch (error) {
    console.log('✗ Basic connectivity failed');
    console.log('  Error:', error.message);
  }
  console.log('');

  // Test 2: API endpoint with authentication
  console.log('Test 2: Testing /api/cfip endpoint...');
  try {
    const response = await axios.get(`${apiUrl}/api/cfip`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('✓ API endpoint OK');
    console.log('  Status:', response.status);
    console.log('  Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('✗ API endpoint failed');
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('  Error:', error.message);
    }
  }
  console.log('');

  // Test 3: Test with apikey query parameter
  console.log('Test 3: Testing with apikey query parameter...');
  try {
    const response = await axios.get(`${apiUrl}/api/cfip?apikey=${apiKey}`, {
      timeout: 10000
    });
    console.log('✓ Query parameter authentication OK');
    console.log('  Status:', response.status);
    console.log('  Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('✗ Query parameter authentication failed');
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('  Error:', error.message);
    }
  }
  console.log('');

  // Test 4: Login endpoint
  console.log('Test 4: Testing login endpoint...');
  try {
    const response = await axios.post(`${apiUrl}/api/auth/login`, {
      apiKey: apiKey
    }, {
      timeout: 10000
    });
    console.log('✓ Login OK');
    console.log('  Status:', response.status);
    console.log('  Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.apiKey) {
      console.log('');
      console.log('Test 5: Testing with session token...');
      try {
        const sessionResponse = await axios.get(`${apiUrl}/api/cfip`, {
          headers: {
            'X-API-Key': response.data.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        console.log('✓ Session token OK');
        console.log('  Status:', sessionResponse.status);
        console.log('  Data:', JSON.stringify(sessionResponse.data, null, 2));
      } catch (error) {
        console.log('✗ Session token failed');
        if (error.response) {
          console.log('  Status:', error.response.status);
          console.log('  Data:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.log('  Error:', error.message);
        }
      }
    }
  } catch (error) {
    console.log('✗ Login failed');
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('  Error:', error.message);
    }
  }
}

testAPI().catch(console.error);
