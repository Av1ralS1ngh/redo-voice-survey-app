#!/usr/bin/env node

/**
 * Test Hume's Audio Reconstruction API
 * 
 * Based on documentation: GET /chats/{chat_id}/audio
 * This API compiles all audio snippets from a chat into a single audio file
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

// Skip token for now and test with API key directly
async function getHumeAccessToken() {
  console.log('🔄 Using API key directly (skipping OAuth for now)');
  return HUME_API_KEY; // Return API key to test direct API access
}

function makeHumeRequest(accessToken, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.hume.ai',
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-Hume-Api-Key': HUME_API_KEY,
        'Accept': 'application/json'
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

async function getRecentChatIds(accessToken) {
  console.log('🔍 Looking for recent chat sessions...');
  
  try {
    // Try to get recent chats/sessions
    const endpoints = [
      '/v0/evi/chats',
      '/v0/evi/sessions', 
      '/v0/evi/conversations'
    ];

    for (const endpoint of endpoints) {
      console.log(`\n📡 Testing endpoint: ${endpoint}`);
      
      try {
        const response = await makeHumeRequest(accessToken, endpoint);
        console.log(`Status: ${response.status}`);
        
        if (response.status === 200) {
          const data = JSON.parse(response.data);
          console.log(`✅ Success! Response structure:`, Object.keys(data));
          
          // Look for chat IDs in the response
          if (data.chats_page && Array.isArray(data.chats_page)) {
            console.log(`📋 Found ${data.chats_page.length} chats in chats_page`);
            if (data.chats_page.length > 0) {
              console.log('📊 First chat structure:', JSON.stringify(data.chats_page[0], null, 2));
              return data.chats_page.slice(0, 3).map(chat => chat.id); // Return first 3 chat IDs
            }
          }
          
          if (data.chats && Array.isArray(data.chats)) {
            console.log(`📋 Found ${data.chats.length} chats`);
            return data.chats.slice(0, 3).map(chat => chat.id); // Return first 3 chat IDs
          }
          
          if (data.sessions && Array.isArray(data.sessions)) {
            console.log(`📋 Found ${data.sessions.length} sessions`);
            return data.sessions.slice(0, 3).map(session => session.id);
          }
          
          // Log the full response if it's small
          if (JSON.stringify(data).length < 2000) {
            console.log('📊 Full response:', JSON.stringify(data, null, 2));
          } else {
            console.log('📊 Large response, keys:', Object.keys(data));
          }
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint} failed:`, error.message);
      }
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error getting chat IDs:', error);
    return [];
  }
}

async function testAudioReconstruction(accessToken, chatId) {
  console.log(`\n🎵 Testing audio reconstruction for chat: ${chatId}`);
  
  try {
    const response = await makeHumeRequest(accessToken, `/v0/evi/chats/${chatId}/audio`);
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('✅ Audio reconstruction response:', JSON.stringify(data, null, 2));
      
      if (data.status === 'COMPLETE' && data.signed_audio_url) {
        console.log('🎯 FOUND AUDIO URL:', data.signed_audio_url);
        console.log('📁 Filename:', data.filename);
        console.log('⏰ Expires:', new Date(data.signed_url_expiration_timestamp_millis));
        return data;
      } else if (data.status === 'QUEUED' || data.status === 'PROCESSING') {
        console.log('⏳ Audio reconstruction in progress, status:', data.status);
        return data;
      }
    } else {
      console.log('❌ Audio reconstruction failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Audio reconstruction error:', error);
  }
  
  return null;
}

async function main() {
  try {
    console.log('🔑 Getting Hume access token...');
    const accessToken = await getHumeAccessToken();
    console.log('✅ Access token obtained');

    // Get recent chat IDs from API
    const chatIds = await getRecentChatIds(accessToken);
    
    // Also test with our recent session ID (Hume might use session IDs as chat IDs)
    const recentSessionId = '288941bf-59d7-4a5a-9a45-a3981da7a6eb';
    const testIds = [...chatIds, recentSessionId];
    
    if (testIds.length === 0) {
      console.log('⚠️  No IDs to test');
      return;
    }

    console.log(`\n🎯 Testing ${testIds.length} IDs for audio reconstruction:`, testIds);

    // Test audio reconstruction for each ID
    for (const testId of testIds) {
      console.log(`\n🔍 Testing ID: ${testId}`);
      const result = await testAudioReconstruction(accessToken, testId);
      
      if (result && result.signed_audio_url) {
        console.log('\n🎉 SUCCESS! Found audio reconstruction capability!');
        console.log('🎯 This means we can retrieve complete conversation audio from Hume!');
        break;
      } else if (result && (result.status === 'QUEUED' || result.status === 'PROCESSING')) {
        console.log('⏳ Audio reconstruction is processing - this is promising!');
      }
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

main();
