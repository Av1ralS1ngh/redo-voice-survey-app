#!/usr/bin/env node

/**
 * Test audio reconstruction and create a playable audio file
 */

const https = require('https');
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

async function testAudioPlayback() {
  // Use one of the available chat IDs that has completed audio
  const testChatId = 'a8aa0013-e723-497b-9258-131b7e32d550';
  
  console.log('🎵 Testing Audio Reconstruction & Playback');
  console.log(`📋 Using chat ID: ${testChatId}`);
  console.log('');

  try {
    // Step 1: Get audio reconstruction status
    console.log('📊 Step 1: Checking audio reconstruction status...');
    
    const response = await fetch(`https://api.hume.ai/v0/evi/chats/${testChatId}/audio`, {
      headers: {
        'X-Hume-Api-Key': HUME_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Audio API failed: ${response.statusText}`);
    }

    const audioData = await response.json();
    console.log('📊 Audio Status:', audioData.status);
    console.log('📁 Filename:', audioData.filename);
    
    if (audioData.status === 'COMPLETE' && audioData.signed_audio_url) {
      console.log('✅ Audio is ready for download!');
      console.log('🔗 URL expires at:', new Date(audioData.signed_url_expiration_timestamp_millis).toLocaleString());
      
      // Step 2: Download the audio file
      console.log('\n⬇️  Step 2: Downloading audio file...');
      
      const audioResponse = await fetch(audioData.signed_audio_url);
      if (!audioResponse.ok) {
        throw new Error(`Audio download failed: ${audioResponse.statusText}`);
      }
      
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioFileName = `test-conversation-audio-${testChatId}.mp4`;
      
      // Save to file
      fs.writeFileSync(audioFileName, Buffer.from(audioBuffer));
      
      console.log(`✅ Audio saved as: ${audioFileName}`);
      console.log(`📊 File size: ${(audioBuffer.byteLength / 1024).toFixed(1)} KB`);
      
      // Step 3: Create a simple HTML player
      const htmlPlayer = `
<!DOCTYPE html>
<html>
<head>
    <title>Conversation Audio Player</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .info { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        audio { width: 100%; margin: 20px 0; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
        .stat { background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 Conversation Audio Player</h1>
        
        <div class="info">
            <strong>Chat ID:</strong> ${testChatId}<br>
            <strong>File:</strong> ${audioFileName}<br>
            <strong>Status:</strong> ${audioData.status}<br>
            <strong>Size:</strong> ${(audioBuffer.byteLength / 1024).toFixed(1)} KB
        </div>
        
        <audio controls>
            <source src="${audioFileName}" type="audio/mp4">
            Your browser does not support the audio element.
        </audio>
        
        <div class="stats">
            <div class="stat">
                <strong>Format</strong><br>
                MP4 Audio
            </div>
            <div class="stat">
                <strong>Source</strong><br>
                Hume EVI
            </div>
        </div>
        
        <p style="text-align: center; color: #666; margin-top: 30px;">
            🎯 This audio was reconstructed from Hume's conversation data using their Audio Reconstruction API.
        </p>
    </div>
</body>
</html>`;
      
      const htmlFileName = `audio-player-${testChatId}.html`;
      fs.writeFileSync(htmlFileName, htmlPlayer);
      
      console.log(`\n🎉 SUCCESS! Audio reconstruction complete:`);
      console.log(`📁 Audio file: ${audioFileName}`);
      console.log(`🌐 HTML player: ${htmlFileName}`);
      console.log(`\n👉 To play the audio:`);
      console.log(`   1. Open ${htmlFileName} in your browser`);
      console.log(`   2. Or use any audio player with ${audioFileName}`);
      console.log(`\n🎯 This proves our audio reconstruction system works!`);
      
      return {
        success: true,
        audioFile: audioFileName,
        htmlPlayer: htmlFileName,
        size: audioBuffer.byteLength
      };
      
    } else {
      console.log(`❌ Audio not ready. Status: ${audioData.status}`);
      return { success: false, status: audioData.status };
    }
    
  } catch (error) {
    console.error('❌ Audio test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testAudioPlayback()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Audio reconstruction test completed successfully!');
    } else {
      console.log('\n❌ Audio reconstruction test failed');
    }
  })
  .catch(error => {
    console.error('Test error:', error);
  });
