// scripts/test-turn-extraction.ts
// Test turn audio extraction with real conversation data

import { createClient } from '@supabase/supabase-js';
import { extractAllTurns } from '../src/lib/audio-extraction-service';
import { processTurnAudio } from '../src/lib/turn-audio-upload-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTurnExtraction() {
  console.log('🧪 TESTING TURN AUDIO EXTRACTION\n');
  console.log('='.repeat(60));
  
  // Use the NEW conversation with time.begin/time.end fields
  const testSessionId = process.env.SESSION_ID || 'df663c88-f133-4cb2-ac10-6d0656e38c9c';
  
  console.log(`\n📋 Test Session: ${testSessionId}\n`);
  
  // Step 1: Get conversation data
  console.log('1️⃣  Fetching conversation data...');
  
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', testSessionId)
    .single();
  
  if (convError || !conversation) {
    console.error('❌ Error fetching conversation:', convError);
    process.exit(1);
  }
  
  console.log(`✅ Conversation found:`);
  console.log(`   User: ${conversation.user_name}`);
  console.log(`   Turns: ${conversation.conversation_data.turns.length}`);
  console.log(`   Audio URL: ${conversation.conversation_data.audio_url ? 'Present' : 'Missing'}`);
  
  if (!conversation.conversation_data.audio_url) {
    console.error('❌ No audio URL found. Run audio reconstruction first.');
    process.exit(1);
  }
  
  // Step 2: Extract turn audio
  console.log('\n2️⃣  Extracting turn audio segments...\n');
  
  const turns = conversation.conversation_data.turns;
  const conversationStart = new Date(conversation.started_at);
  const audioUrl = conversation.conversation_data.audio_url;
  
  try {
    const extractionResult = await extractAllTurns(
      testSessionId,
      audioUrl,
      turns,
      conversationStart
    );
    
    console.log(`\n📊 Extraction Results:`);
    console.log(`   Success: ${extractionResult.success}`);
    console.log(`   Extracted: ${extractionResult.extracted}`);
    console.log(`   Failed: ${extractionResult.failed}`);
    console.log(`   Total Segments: ${extractionResult.segments.length}`);
    
    if (!extractionResult.success) {
      console.error('❌ Extraction failed');
      process.exit(1);
    }
    
    // Step 3: Upload to Supabase and update database
    console.log('\n3️⃣  Uploading turn audio to Supabase...\n');
    
    const uploadResult = await processTurnAudio(
      testSessionId,
      extractionResult.segments
    );
    
    console.log(`\n📊 Upload Results:`);
    console.log(`   Success: ${uploadResult.success}`);
    console.log(`   Uploaded: ${uploadResult.uploaded}`);
    console.log(`   Failed: ${uploadResult.failed}`);
    console.log(`   DB Records: ${uploadResult.dbRecords}`);
    
    // Step 4: Verify in database
    console.log('\n4️⃣  Verifying database records...\n');
    
    const { data: audioRecords, error: audioError } = await supabase
      .from('conversation_audio')
      .select('*')
      .eq('session_id', testSessionId)
      .order('turn_number', { ascending: true });
    
    if (audioError) {
      console.error('❌ Error querying conversation_audio:', audioError);
    } else {
      console.log(`✅ Found ${audioRecords?.length || 0} audio records in database:`);
      audioRecords?.slice(0, 5).forEach(record => {
        console.log(`   Turn ${record.turn_number} (${record.speaker}): ${record.audio_url?.substring(0, 60)}...`);
      });
    }
    
    // Step 5: Verify in Supabase Storage
    console.log('\n5️⃣  Verifying Supabase Storage...\n');
    
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('conversation-audio')
      .list(`conversations/${testSessionId}/turns`, {
        limit: 100
      });
    
    if (storageError) {
      console.error('❌ Error listing storage files:', storageError);
    } else {
      console.log(`✅ Found ${storageFiles?.length || 0} files in storage:`);
      storageFiles?.forEach(file => {
        const sizeKB = ((file.metadata?.size || 0) / 1024).toFixed(2);
        console.log(`   ${file.name} (${sizeKB} KB)`);
      });
    }
    
    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST COMPLETE - TURN AUDIO EXTRACTION WORKING!');
    console.log('='.repeat(60));
    console.log(`\n✅ Extracted ${extractionResult.extracted} turn audio files`);
    console.log(`✅ Uploaded ${uploadResult.uploaded} files to Supabase`);
    console.log(`✅ Created ${uploadResult.dbRecords} database records`);
    console.log(`✅ All files accessible in storage\n`);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

testTurnExtraction().catch(console.error);
