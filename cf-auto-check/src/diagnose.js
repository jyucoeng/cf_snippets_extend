require('dotenv').config();
const https = require('https');
const http = require('http');
const { URL } = require('url');
const dns = require('dns').promises;

async function diagnose() {
  const apiUrl = process.env.API_URL;
  
  console.log('=== Network Diagnostics ===\n');
  console.log('Target URL:', apiUrl);
  console.log('');

  try {
    const url = new URL(apiUrl);
    
    // Step 1: DNS Resolution
    console.log('Step 1: DNS Resolution');
    console.log('Hostname:', url.hostname);
    try {
      const addresses = await dns.resolve4(url.hostname);
      console.log('✓ DNS Resolution successful');
      console.log('  IP Addresses:', addresses.join(', '));
    } catch (error) {
      console.log('✗ DNS Resolution failed');
      console.log('  Error:', error.message);
      console.log('  Suggestion: Check if the domain exists and is accessible');
      return;
    }
    console.log('');

    // Step 2: TCP Connection
    console.log('Step 2: TCP Connection');
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    console.log('Port:', port);
    
    const canConnect = await testConnection(url.hostname, port);
    if (canConnect) {
      console.log('✓ TCP Connection successful');
    } else {
      console.log('✗ TCP Connection failed');
      console.log('  Suggestion: Check firewall settings or if the server is running');
      return;
    }
    console.log('');

    // Step 3: HTTP/HTTPS Request
    console.log('Step 3: HTTP/HTTPS Request');
    const protocol = url.protocol === 'https:' ? https : http;
    
    try {
      const response = await makeRequest(protocol, url.hostname, port, '/');
      console.log('✓ HTTP Request successful');
      console.log('  Status Code:', response.statusCode);
      console.log('  Headers:', JSON.stringify(response.headers, null, 2));
    } catch (error) {
      console.log('✗ HTTP Request failed');
      console.log('  Error:', error.message);
    }
    console.log('');

    // Step 4: API Endpoint Test
    console.log('Step 4: API Endpoint Test');
    try {
      const response = await makeRequest(protocol, url.hostname, port, '/api/cfip', {
        'X-API-Key': process.env.API_KEY
      });
      console.log('✓ API Endpoint accessible');
      console.log('  Status Code:', response.statusCode);
      
      if (response.statusCode === 401) {
        console.log('  Note: Authentication required (401)');
        console.log('  Suggestion: Check if API_KEY is correct');
      } else if (response.statusCode === 200) {
        console.log('  ✓ Authentication successful');
      }
    } catch (error) {
      console.log('✗ API Endpoint failed');
      console.log('  Error:', error.message);
    }
    console.log('');

    console.log('=== Diagnostics Complete ===');
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

function testConnection(hostname, port) {
  return new Promise((resolve) => {
    const socket = new (require('net').Socket)();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, hostname);
  });
}

function makeRequest(protocol, hostname, port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'CF-Auto-Check/1.0',
        ...headers
      },
      timeout: 10000,
      rejectUnauthorized: false
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

diagnose().catch(console.error);
