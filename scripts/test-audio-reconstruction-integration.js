#!/usr/bin/env node

/**
 * Test the complete audio reconstruction integration
 * This tests our new API endpoints and services
 */

const http = require('http');

async function testAudioReconstruction() {
  // Use the most recent session ID
  const testSessionId = 'cba97d90-8c98-4803-a6a3-75625e2593ce';
  
  console.log('🎯 Testing Audio Reconstruction Integration');
  console.log(`📋 Using session ID: ${testSessionId}`);
  console.log('');

  try {
    // Step 1: Initiate audio reconstruction
    console.log('🚀 Step 1: Initiating audio reconstruction...');
    
    const startResponse = await makeRequest('POST', '/api/conversation/audio', {
      sessionId: testSessionId,
      action: 'start'
    });

    console.log('📊 Start Response:', JSON.stringify(startResponse, null, 2));

    if (startResponse.success && startResponse.chatId) {
      console.log(`✅ Successfully found chat ID: ${startResponse.chatId}`);
      
      if (startResponse.status === 'COMPLETE' && startResponse.audioUrl) {
        console.log(`🎉 Audio already available: ${startResponse.audioUrl}`);
        return;
      }

      // Step 2: Poll for completion
      console.log('\n⏳ Step 2: Polling for completion...');
      
      const pollResponse = await makeRequest('POST', '/api/conversation/audio', {
        sessionId: testSessionId,
        chatId: startResponse.chatId,
        action: 'poll'
      });

      console.log('📊 Poll Response:', JSON.stringify(pollResponse, null, 2));

      if (pollResponse.success && pollResponse.audioUrl) {
        console.log(`🎉 SUCCESS! Audio retrieved: ${pollResponse.audioUrl}`);
      } else {
        console.log('⏰ Audio still processing or failed');
        
        // Step 3: Check status
        console.log('\n📊 Step 3: Checking current status...');
        
        const statusResponse = await makeRequest('POST', '/api/conversation/audio', {
          sessionId: testSessionId,
          chatId: startResponse.chatId,
          action: 'status'
        });

        console.log('📊 Status Response:', JSON.stringify(statusResponse, null, 2));
      }

    } else {
      console.log('❌ Failed to initiate audio reconstruction');
      console.log('Error:', startResponse.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Run the test
testAudioReconstruction();
