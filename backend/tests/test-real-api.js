/**
 * Test script để gọi real API endpoint
 * GET /api/blog/posts?status=approved&limit=50
 */

require('dotenv').config();
const http = require('http');

async function testRealAPI() {
  console.log('🚀 Testing real API endpoint...\n');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/blog/posts?status=approved&limit=50',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`📡 Response Status: ${res.statusCode}`);
      console.log(`📡 Response Headers:`, res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS! Response:');
            console.log(JSON.stringify(response, null, 2).substring(0, 1000) + '...');
            
            if (response.data && response.data.length > 0) {
              console.log(`\n📊 Posts returned: ${response.data.length}`);
              console.log(`📊 First post author: ${response.data[0].author ? response.data[0].author.email : 'NULL'}`);
              console.log(`📊 First post has authorProfile: ${response.data[0].authorProfile ? 'YES' : 'NO'}`);
            }
          } else {
            console.log('\n❌ ERROR! Response:');
            console.log(JSON.stringify(response, null, 2));
          }
          resolve(response);
        } catch (e) {
          console.error('Parse error:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

testRealAPI()
  .then(() => {
    console.log('\n✅ API test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
