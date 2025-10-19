#!/usr/bin/env node

/**
 * Test script to investigate Hume's built-in audio storage
 * This will help us understand what audio data Hume provides
 * without building complex capture systems
 */

const https = require('https');
const fs = require('fs');

// Read environment variables from .env.local
let HUME_API_KEY, HUME_SECRET_KEY;
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('HUME_API_KEY=')) {
      HUME_API_KEY = line.split('=')[1].trim();
    }
    if (line.startsWith('HUME_SECRET_KEY=')) {
      HUME_SECRET_KEY = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file');
}

if (!HUME_API_KEY || !HUME_SECRET_KEY) {
  console.error('❌ Missing Hume API credentials');
  process.exit(1);
}

async function getHumeAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      grant_type: 'client_credentials',
      client_id: HUME_API_KEY,
      client_secret: HUME_SECRET_KEY
    });

    const options = {
      hostname: 'api.hume.ai',
      port: 443,
      path: '/oauth2-cc/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          console.log('🔍 Token response:', data);
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`No access token in response: ${JSON.stringify(response)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function investigateHumeAudioAPIs(accessToken) {
  console.log('🔍 Investigating Hume Audio APIs...');
  
  // Test various potential endpoints
  const endpoints = [
    '/v0/evi/chats',
    '/v0/evi/configs', 
    '/v0/evi/sessions',
    '/v0/evi/audio',
    '/v0/evi/recordings'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing endpoint: ${endpoint}`);
      
      const response = await makeHumeRequest(accessToken, endpoint);
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      
      if (response.status === 200) {
        const data = JSON.parse(response.data);
        console.log(`📊 Response structure:`, Object.keys(data));
        
        // If this looks like it contains audio info, log more details
        if (JSON.stringify(data).toLowerCase().includes('audio')) {
          console.log(`🎵 Audio-related data found:`, JSON.stringify(data, null, 2).substring(0, 500));
        }
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

function makeHumeRequest(accessToken, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.hume.ai',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('🔑 Getting Hume access token...');
    const accessToken = await getHumeAccessToken();
    console.log('✅ Access token obtained');

    await investigateHumeAudioAPIs(accessToken);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Check if any endpoints returned audio-related data');
    console.log('2. Look for session/chat endpoints that might contain audio URLs');
    console.log('3. Test with a recent session ID from your database');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

main();
