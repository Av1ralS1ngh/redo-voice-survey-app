#!/usr/bin/env node

/**
 * Debug script to understand the chat ID mapping issue
 */

const http = require('http');
const fs = require('fs');

// Read environment variables from .env.local
let HUME_API_KEY;
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('HUME_API_KEY=')) {
      HUME_API_KEY = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file');
}

async function debugChatMapping() {
  console.log('🔍 Debug: Chat ID Mapping');
  console.log('');
  
  try {
    // Step 1: Get our conversation from database
    const testSessionId = 'cba97d90-8c98-4803-a6a3-75625e2593ce';
    
    console.log('📋 Step 1: Getting conversation from our database...');
    const dbResponse = await makeRequest('GET', '/api/debug-conversation-data');
    
    const conversation = dbResponse.raw_conversations.find(c => c.session_id === testSessionId);
    if (!conversation) {
      console.log('❌ Conversation not found in our database');
      return;
    }
    
    console.log(`✅ Found conversation: ${conversation.started_at}`);
    const conversationStartTime = new Date(conversation.started_at).getTime();
    console.log(`📅 Conversation timestamp: ${conversationStartTime}`);
    
    // Step 2: Get Hume chats directly
    console.log('\n📋 Step 2: Getting chats from Hume...');
    
    const humeResponse = await fetch('https://api.hume.ai/v0/evi/chats', {
      headers: {
        'X-Hume-Api-Key': HUME_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!humeResponse.ok) {
      throw new Error(`Hume API failed: ${humeResponse.statusText}`);
    }
    
    const humeData = await humeResponse.json();
    console.log(`✅ Got ${humeData.chats_page?.length || 0} chats from Hume`);
    
    if (humeData.chats_page && humeData.chats_page.length > 0) {
      console.log('\n🔍 Available chats:');
      
      humeData.chats_page.forEach((chat, index) => {
        const chatStartTime = chat.start_timestamp;
        const timeDiff = Math.abs(conversationStartTime - chatStartTime);
        const timeDiffMinutes = timeDiff / 60000;
        
        console.log(`  ${index + 1}. Chat ${chat.id}`);
        console.log(`     Started: ${new Date(chatStartTime).toISOString()}`);
        console.log(`     Diff: ${timeDiffMinutes.toFixed(1)} minutes`);
        console.log(`     Status: ${chat.status}`);
        console.log(`     Events: ${chat.event_count}`);
        console.log('');
      });
      
      // Find best match
      let bestMatch = null;
      let smallestTimeDiff = Infinity;
      
      for (const chat of humeData.chats_page) {
        const timeDiff = Math.abs(conversationStartTime - chat.start_timestamp);
        if (timeDiff < smallestTimeDiff) {
          smallestTimeDiff = timeDiff;
          bestMatch = chat;
        }
      }
      
      if (bestMatch) {
        const diffMinutes = smallestTimeDiff / 60000;
        console.log(`🎯 Best match: ${bestMatch.id} (${diffMinutes.toFixed(1)} min diff)`);
        
        if (diffMinutes < 30) {
          console.log('✅ This should work for audio reconstruction!');
        } else {
          console.log('⚠️  Time difference is large - might not be the right chat');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

function makeRequest(method, path, body) {
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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

debugChatMapping();
