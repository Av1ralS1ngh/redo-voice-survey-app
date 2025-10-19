// scripts/test-full-audio-pipeline.ts
// Comprehensive test of the audio reconstruction and turn extraction pipeline

import { createClient } from '@supabase/supabase-js';
import { calculateTurnTimeRanges, validateTurnTimestamps } from '../src/lib/audio-extraction-service';
import { ConversationTurn } from '../src/lib/conversation-manager';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Full Audio Pipeline Test\n');
console.log('='

.repeat(60));

async function testAudioReconstruction() {
  console.log('\n📋 TEST 1: Audio Reconstruction Status\n');
  
  // Get the latest completed conversation with audio
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('status', 'completed')
    .not('conversation_data', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error fetching conversations:', error.message);
    return null;
  }

  if (!conversations || conversations.length === 0) {
    console.log('⚠️  No completed conversations found');
    console.log('💡 Complete a test conversation first');
    return null;
  }

  console.log(`📊 Found ${conversations.length} completed conversations:\n`);

  let conversationWithAudio = null;

  for (const conv of conversations) {
    const hasAudio = !!conv.conversation_data?.audio_url;
    const turnCount = conv.conversation_data?.turns?.length || 0;
    
    console.log(`${hasAudio ? '✅' : '❌'} Session: ${conv.session_id.substring(0, 8)}...`);
    console.log(`   User: ${conv.user_name}`);
    console.log(`   Turns: ${turnCount}`);
    console.log(`   Audio: ${hasAudio ? 'Present' : 'Missing'}`);
    console.log(`   Completed: ${conv.completed_at || 'N/A'}`);
    console.log('');

    if (hasAudio && turnCount > 0 && !conversationWithAudio) {
      conversationWithAudio = conv;
    }
  }

  if (conversationWithAudio) {
    console.log(`\n🎯 Selected conversation for testing: ${conversationWithAudio.session_id}\n`);
    return conversationWithAudio;
  } else {
    console.log('⚠️  No conversations with both audio and turn data found');
    return null;
  }
}

async function testChatMetadata(sessionId: string) {
  console.log('\n📋 TEST 2: Chat Metadata Lookup\n');

  const { data, error } = await supabase
    .from('conversation_chat_metadata')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('❌ Error:', error.message);
    return null;
  }

  if (!data) {
    console.log('❌ No chat metadata found for session');
    console.log('💡 This is the data needed for audio reconstruction');
    return null;
  }

  console.log('✅ Chat metadata found:');
  console.log(`   Hume Chat ID: ${data.hume_chat_id}`);
  console.log(`   Chat Group ID: ${data.hume_chat_group_id || 'N/A'}`);
  console.log(`   Captured At: ${data.captured_at}`);
  console.log('');

  return data;
}

async function testTurnData(conversation: any) {
  console.log('\n📋 TEST 3: Turn Data Structure\n');

  const turns = conversation.conversation_data?.turns || [];
  
  if (turns.length === 0) {
    console.log('❌ No turns found in conversation data');
    return null;
  }

  console.log(`📊 Total turns: ${turns.length}\n`);

  // Validate timestamps
  const validation = validateTurnTimestamps(turns);
  
  if (validation.valid) {
    console.log('✅ All timestamps are valid and ordered\n');
  } else {
    console.log('⚠️  Timestamp validation issues:');
    validation.issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }

  // Display first 3 turns
  console.log('📝 Sample turn data (first 3):\n');
  
  turns.slice(0, 3).forEach((turn: any, idx: number) => {
    console.log(`Turn ${idx + 1} (${turn.speaker}):`);
    console.log(`   Message: "${turn.message?.substring(0, 60)}..."`);
    console.log(`   Timestamp: ${turn.timestamp}`);
    console.log(`   Turn Number: ${turn.turn_number}`);
    console.log(`   Prosody Duration: ${turn.prosody?.duration || 'N/A'}s`);
    console.log('');
  });

  // Check for required fields
  const hasTimestamps = turns.every((t: any) => t.timestamp);
  const hasSpeaker = turns.every((t: any) => t.speaker);
  const hasTurnNumber = turns.every((t: any) => t.turn_number);
  
  console.log('📊 Data completeness:');
  console.log(`   ${hasTimestamps ? '✅' : '❌'} All turns have timestamps`);
  console.log(`   ${hasSpeaker ? '✅' : '❌'} All turns have speaker`);
  console.log(`   ${hasTurnNumber ? '✅' : '❌'} All turns have turn_number`);
  
  const prosodyCount = turns.filter((t: any) => t.prosody?.duration).length;
  console.log(`   ⚠️  ${prosodyCount}/${turns.length} turns have prosody.duration`);
  console.log('');

  return turns;
}

async function testTimeRangeCalculation(conversation: any, turns: ConversationTurn[]) {
  console.log('\n📋 TEST 4: Time Range Calculation\n');

  const conversationStart = new Date(conversation.started_at);
  console.log(`📅 Conversation started: ${conversationStart.toISOString()}\n`);

  const timeRanges = calculateTurnTimeRanges(turns, conversationStart);

  if (timeRanges.length === 0) {
    console.log('❌ Failed to calculate time ranges');
    return null;
  }

  console.log(`✅ Calculated ${timeRanges.length} time ranges:\n`);

  // Display all time ranges
  timeRanges.forEach((range, idx) => {
    const startSec = (range.startMs / 1000).toFixed(2);
    const endSec = (range.endMs / 1000).toFixed(2);
    const durSec = (range.durationMs / 1000).toFixed(2);
    
    console.log(`  ${idx + 1}. Turn ${range.turn_number} (${range.speaker})`);
    console.log(`     Time: ${startSec}s - ${endSec}s (duration: ${durSec}s)`);
  });

  console.log('');

  // Calculate total conversation duration
  const lastRange = timeRanges[timeRanges.length - 1];
  const totalDuration = (lastRange.endMs / 1000).toFixed(2);
  
  console.log(`📊 Total conversation duration: ${totalDuration}s`);
  console.log('');

  return timeRanges;
}

async function testAudioFileAccess(conversation: any) {
  console.log('\n📋 TEST 5: Audio File Access\n');

  const audioUrl = conversation.conversation_data?.audio_url;

  if (!audioUrl) {
    console.log('❌ No audio URL found in conversation data');
    return null;
  }

  console.log(`🔗 Audio URL: ${audioUrl}\n`);

  try {
    console.log('⬇️  Testing audio file download...');
    const response = await fetch(audioUrl);

    if (!response.ok) {
      console.log(`❌ Failed to fetch audio: ${response.status} ${response.statusText}`);
      return null;
    }

    const audioBlob = await response.blob();
    const sizeKB = (audioBlob.size / 1024).toFixed(2);
    const sizeMB = (audioBlob.size / 1024 / 1024).toFixed(2);

    console.log(`✅ Audio file downloaded successfully`);
    console.log(`   Size: ${sizeKB} KB (${sizeMB} MB)`);
    console.log(`   Type: ${audioBlob.type}`);
    console.log('');

    return audioBlob;
  } catch (error) {
    console.log(`❌ Error downloading audio: ${error}`);
    return null;
  }
}

async function generateTestReport(
  conversation: any,
  chatMetadata: any,
  turns: any[],
  timeRanges: any[],
  audioBlob: any
) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST REPORT SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log('✅ PASSED TESTS:');
  const passedTests = [];
  const failedTests = [];

  if (conversation) passedTests.push('Audio Reconstruction - Conversation data retrieved');
  else failedTests.push('Audio Reconstruction - No conversation data');

  if (chatMetadata) passedTests.push('Chat Metadata - Hume chat ID found');
  else failedTests.push('Chat Metadata - Missing chat ID');

  if (turns && turns.length > 0) passedTests.push('Turn Data - Turns retrieved and validated');
  else failedTests.push('Turn Data - No turn data found');

  if (timeRanges && timeRanges.length > 0) passedTests.push('Time Calculation - Ranges calculated successfully');
  else failedTests.push('Time Calculation - Failed to calculate ranges');

  if (audioBlob) passedTests.push('Audio Access - File downloaded successfully');
  else failedTests.push('Audio Access - Could not download audio file');

  passedTests.forEach(test => console.log(`   ✅ ${test}`));
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(test => console.log(`   ❌ ${test}`));
  }

  console.log('\n📋 READINESS FOR PHASE 3:');
  
  const readyForPhase3 = passedTests.length === 5;
  
  if (readyForPhase3) {
    console.log('   ✅ All prerequisites met!');
    console.log('   ✅ Ready to implement FFmpeg audio extraction (Phase 2.3)');
    console.log('   ✅ Ready to integrate with conversation complete (Phase 3)');
  } else {
    console.log(`   ⚠️  ${failedTests.length} prerequisite(s) not met`);
    console.log('   💡 Fix failed tests before proceeding to Phase 3');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return readyForPhase3;
}

// Main test execution
async function runTests() {
  try {
    const conversation = await testAudioReconstruction();
    if (!conversation) {
      console.log('\n💡 TIP: Complete a test conversation with audio to run full tests\n');
      process.exit(0);
    }

    const chatMetadata = await testChatMetadata(conversation.session_id);
    const turns = await testTurnData(conversation);
    
    let timeRanges = null;
    if (turns) {
      timeRanges = await testTimeRangeCalculation(conversation, turns);
    }

    const audioBlob = await testAudioFileAccess(conversation);

    const ready = await generateTestReport(conversation, chatMetadata, turns, timeRanges, audioBlob);

    process.exit(ready ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
