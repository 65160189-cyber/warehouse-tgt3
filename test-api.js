// Simple API test script
const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: body
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAPI() {
    console.log('🧪 Testing TGT3 Warehouse API...\n');

    try {
        // Test health endpoint
        console.log('1. Testing health endpoint...');
        const health = await makeRequest('/api/health');
        console.log(`   Status: ${health.statusCode}`);
        console.log(`   Response: ${health.body}\n`);

        // Test login
        console.log('2. Testing login endpoint...');
        const loginData = {
            username: 'admin',
            password: 'admin123'
        };
        const login = await makeRequest('/api/auth/login', 'POST', loginData);
        console.log(`   Status: ${login.statusCode}`);
        console.log(`   Response: ${login.body}\n`);

        // Test dashboard (should fail without token)
        console.log('3. Testing dashboard without auth...');
        const dashboard = await makeRequest('/api/dashboard/stats');
        console.log(`   Status: ${dashboard.statusCode}`);
        console.log(`   Response: ${dashboard.body}\n`);

        console.log('✅ API test completed!');
        console.log('If health endpoint works but others fail, the server is running but database may not be configured.');

    } catch (error) {
        console.error('❌ API test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure the server is running (npm start)');
        console.log('2. Check if MySQL is running and accessible');
        console.log('3. Verify .env configuration');
    }
}

if (require.main === module) {
    testAPI();
}

module.exports = { testAPI };
