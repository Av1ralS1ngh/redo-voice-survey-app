// scripts/test-turn-audio-storage.ts
// Script to verify turn audio files in Supabase Storage

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTurnAudioStorage() {
  console.log('🔍 Testing Turn Audio Storage...\n');
  
  // 1. Get latest conversation
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, session_id, timestamp')
    .order('timestamp', { ascending: false })
    .limit(5);
  
  if (convError) {
    console.error('❌ Error fetching conversations:', convError);
    return;
  }
  
  console.log(`📊 Latest ${conversations?.length || 0} conversations:\n`);
  conversations?.forEach((conv, i) => {
    console.log(`${i + 1}. Conversation ID: ${conv.id}`);
    console.log(`   Session ID: ${conv.session_id}`);
    console.log(`   Created: ${new Date(conv.timestamp).toLocaleString()}\n`);
  });
  
  if (!conversations || conversations.length === 0) {
    console.log('⚠️  No conversations found. Please run a test conversation first.');
    return;
  }
  
  // 2. Check conversation_audio table for each conversation
  console.log('\n📁 Checking conversation_audio table...\n');
  
  for (const conv of conversations) {
    const { data: audioRecords, error: audioError } = await supabase
      .from('conversation_audio')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('turn_number', { ascending: true });
    
    if (audioError) {
      console.log(`❌ Error fetching audio for conversation ${conv.id}:`, audioError.message);
      continue;
    }
    
    if (!audioRecords || audioRecords.length === 0) {
      console.log(`⚠️  No turn audio found for conversation ${conv.id}`);
      console.log(`   (This is expected if the conversation was before the implementation)\n`);
      continue;
    }
    
    console.log(`✅ Conversation ${conv.id.substring(0, 8)}... has ${audioRecords.length} turn audio records:`);
    audioRecords.forEach(record => {
      console.log(`   - Turn ${record.turn_number} (${record.speaker}): ${record.audio_url}`);
      console.log(`     Duration: ${record.audio_duration}ms, Status: ${record.processing_status}`);
    });
    console.log('');
    
    // 3. Verify files exist in Storage
    console.log(`🔍 Verifying storage files for conversation ${conv.id.substring(0, 8)}...\n`);
    
    for (const record of audioRecords) {
      // Extract path from URL
      const urlParts = record.audio_url.split('/conversations/');
      if (urlParts.length < 2) {
        console.log(`   ⚠️  Invalid URL format: ${record.audio_url}`);
        continue;
      }
      
      const filePath = `conversations/${urlParts[1]}`;
      
      // Check if file exists
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('conversation-audio')
        .list(filePath.substring(0, filePath.lastIndexOf('/')));
      
      if (fileError) {
        console.log(`   ❌ Error checking file: ${fileError.message}`);
      } else {
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const fileExists = fileData?.some(f => f.name === fileName);
        
        if (fileExists) {
          console.log(`   ✅ File exists: ${fileName}`);
        } else {
          console.log(`   ❌ File NOT found: ${fileName}`);
        }
      }
    }
    console.log('');
  }
  
  // 4. Summary
  console.log('\n📊 SUMMARY:\n');
  
  const { data: allAudioRecords } = await supabase
    .from('conversation_audio')
    .select('*');
  
  const totalRecords = allAudioRecords?.length || 0;
  const userRecords = allAudioRecords?.filter(r => r.speaker === 'user').length || 0;
  const agentRecords = allAudioRecords?.filter(r => r.speaker === 'agent').length || 0;
  
  console.log(`Total turn audio records: ${totalRecords}`);
  console.log(`  - User turns: ${userRecords}`);
  console.log(`  - Agent turns: ${agentRecords}`);
  console.log('');
  
  if (totalRecords === 0) {
    console.log('⚠️  No turn audio records found.');
    console.log('💡 Please run a test conversation and check browser console for logs.');
  } else {
    console.log('✅ Turn audio capture is working!');
  }
}

testTurnAudioStorage().catch(console.error);
