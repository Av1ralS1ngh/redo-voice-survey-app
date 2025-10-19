/**
 * 🧪 TEST SCRIPT: Validate Chat Group → REST API Connection
 * 
 * This script checks if our WebSocket sessions (using resumedChatGroupId) 
 * actually appear in the REST API chat list.
 */

const { HumeClient } = require('hume');
const { supabaseService } = require('../src/lib/supabase');

async function testChatGroupConnection() {
  console.log('🧪 Testing Chat Group → REST API Connection');
  console.log('');

  // Get the most recent conversation with chat group data
  console.log('📋 Step 1: Finding recent conversation with chat group...');
  const { data: conversation, error } = await supabaseService()
    .from('conversations')
    .select('session_id, metadata, started_at')
    .not('metadata', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !conversation) {
    console.error('❌ No conversation found with metadata');
    console.log('💡 Run a test conversation first with the updated code');
    return;
  }

  const metadata = JSON.parse(conversation.metadata || '{}');
  const connectionTimestamp = metadata.connection_timestamp;

  console.log(`✅ Found conversation: ${conversation.session_id}`);
  console.log(`📅 Started at: ${conversation.started_at}`);
  console.log(`🔗 Connection timestamp: ${connectionTimestamp}`);
  console.log('');

  // Check if chats exist for this chat group
  console.log('📋 Step 2: Checking REST API for chats in this group...');
  const humeClient = new HumeClient({ 
    apiKey: process.env.HUME_API_KEY 
  });

  try {
    // List chats for this specific chat group
    const chatsResponse = await humeClient.empathicVoice.chats.listChats({
      pageSize: 10,
      ascendingOrder: false // Most recent first
    });

    console.log(`📊 Total chats found: ${chatsResponse.data.length}`);
    
    // Look for chats that match our connection time (within 5 minutes)
    const connectionTime = new Date(connectionTimestamp).getTime();
    const matchingChats = chatsResponse.data.filter(chat => {
      const chatStartTime = chat.startTimestamp * 1000; // Convert to milliseconds
      const timeDiff = Math.abs(connectionTime - chatStartTime);
      return timeDiff < 300000; // Within 5 minutes
    });

    if (matchingChats.length > 0) {
      console.log('🎉 SUCCESS: Found matching chats in REST API!');
      matchingChats.forEach((chat, index) => {
        const chatStartTime = new Date(chat.startTimestamp * 1000);
        const timeDiff = Math.abs(connectionTime - chat.startTimestamp * 1000);
        console.log(`  ${index + 1}. Chat ID: ${chat.id}`);
        console.log(`     Status: ${chat.status}`);
        console.log(`     Started: ${chatStartTime.toISOString()}`);
        console.log(`     Time diff: ${(timeDiff / 1000).toFixed(1)}s`);
        console.log(`     Events: ${chat.eventCount || 0}`);
        console.log(`     Chat Group: ${chat.chatGroupId}`);
        console.log('');
      });

      // Test audio reconstruction on the first chat
      if (matchingChats[0]) {
        console.log('🎵 Step 3: Testing audio reconstruction...');
        const audioResult = await humeClient.empathicVoice.chats.getAudio(matchingChats[0].id);
        console.log(`📊 Audio Status: ${audioResult.status}`);
        if (audioResult.signedAudioUrl) {
          console.log(`🔗 Audio URL: ${audioResult.signedAudioUrl}`);
        }
      }

    } else {
      console.log('❌ FAILURE: No chats found matching our connection time');
      console.log('💡 This means our WebSocket sessions are not creating trackable chats');
      
      // Show all available chats for debugging
      console.log('\n🔍 Available chats (for debugging):');
      chatsResponse.data.slice(0, 5).forEach((chat, index) => {
        console.log(`  ${index + 1}. Chat ID: ${chat.id}`);
        console.log(`     Group ID: ${chat.chatGroupId}`);
        console.log(`     Started: ${new Date(chat.startTimestamp * 1000).toISOString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking REST API:', error.message);
  }
}

// Handle environment variables
if (!process.env.HUME_API_KEY) {
  console.error('❌ Missing HUME_API_KEY environment variable');
  process.exit(1);
}

testChatGroupConnection().catch(console.error);
