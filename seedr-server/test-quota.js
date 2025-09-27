// Test script to verify quota enforcement
const axios = require('axios');

async function testQuotaEnforcement() {
  try {
    // Register a new user for testing
    console.log('📝 Registering new test user...');
    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        username: 'quotatest',
        email: 'quotatest@test.com',
        password: 'password123'
      });
      console.log('✅ User registered successfully');
    } catch (regError) {
      if (regError.response?.data?.error?.includes('already exists')) {
        console.log('👤 User already exists, continuing...');
      } else {
        throw regError;
      }
    }

    // Login as the test user
    console.log('🔐 Logging in as quotatest...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'quotatest',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Get user profile to check current quota usage
    console.log('📊 Getting user profile...');
    const profileResponse = await axios.get('http://localhost:5000/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = profileResponse.data.user;
    console.log('👤 User Profile:', {
      username: user.username,
      email: user.email,
      storageUsed: Math.round(user.storageUsed / 1024 / 1024) + ' MB',
      storageQuota: Math.round(user.storageQuota / 1024 / 1024 / 1024) + ' GB',
      available: Math.round((user.storageQuota - user.storageUsed) / 1024 / 1024) + ' MB'
    });

    // Try to add a torrent that exceeds quota (using a real magnet for a large file)
    console.log('🚀 Attempting to add a large torrent...');

    // This is a magnet link for a Linux distro (several GB)
    const largeMagnet = 'magnet:?xt=urn:btih:5ac55cf1b95d96096e96c2f9ad90a7d5283f8bb9&dn=ubuntu-20.04.3-desktop-amd64.iso&tr=http://torrent.ubuntu.com:6969/announce';

    const addResponse = await axios.post('http://localhost:5000/api/torrents', {
      magnet: largeMagnet
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('⚠️ Unexpected: Torrent was added despite quota limits!');
    console.log('Response:', addResponse.data);

  } catch (error) {
    console.log('❌ Error occurred:', error.response?.status, error.response?.statusText);

    if (error.response?.status === 413) {
      console.log('✅ Quota enforcement working correctly!');
      console.log('🚫 Error Details:', {
        error: error.response.data.error,
        message: error.response.data.message,
        details: error.response.data.details
      });
    } else {
      console.log('💥 Unexpected error:', error.response?.data || error.message);
    }
  }
}

testQuotaEnforcement();