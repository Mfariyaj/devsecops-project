// ============================================
// User Service Tests - For SonarQube Coverage
// ============================================
const http = require('http');

const BASE_URL = 'http://localhost:3001';

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${path}`, { method }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running User Service Tests...\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  try {
    const res = await makeRequest('/health');
    console.assert(res.statusCode === 200, 'Health check should return 200');
    console.assert(res.body.status === 'UP', 'Status should be UP');
    console.log('  ✅ Health check endpoint');
    passed++;
  } catch (e) {
    console.log('  ❌ Health check endpoint:', e.message);
    failed++;
  }

  // Test 2: Get all users
  try {
    const res = await makeRequest('/users');
    console.assert(res.statusCode === 200, 'Users should return 200');
    console.assert(Array.isArray(res.body.data), 'Should return array');
    console.assert(res.body.data.length > 0, 'Should have users');
    console.log('  ✅ Get all users');
    passed++;
  } catch (e) {
    console.log('  ❌ Get all users:', e.message);
    failed++;
  }

  // Test 3: Get user by ID
  try {
    const res = await makeRequest('/users/1');
    console.assert(res.statusCode === 200, 'User 1 should return 200');
    console.assert(res.body.data.id === 1, 'Should return user with id 1');
    console.log('  ✅ Get user by ID');
    passed++;
  } catch (e) {
    console.log('  ❌ Get user by ID:', e.message);
    failed++;
  }

  // Test 4: 404 for non-existent user
  try {
    const res = await makeRequest('/users/9999');
    console.assert(res.statusCode === 404, 'Should return 404');
    console.log('  ✅ 404 for non-existent user');
    passed++;
  } catch (e) {
    console.log('  ❌ 404 test:', e.message);
    failed++;
  }

  // Test 5: 404 for unknown route
  try {
    const res = await makeRequest('/unknown');
    console.assert(res.statusCode === 404, 'Should return 404');
    console.log('  ✅ 404 for unknown route');
    passed++;
  } catch (e) {
    console.log('  ❌ Unknown route test:', e.message);
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
