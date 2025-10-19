/**
 * Investigation script to check transcript ordering issues
 * This will help us understand what's happening with message order
 */

const { supabaseService } = require('../src/lib/supabase');

async function investigateTranscriptOrdering() {
  console.log('🔍 Investigating Transcript Ordering Issue');
  console.log('');

  try {
    // Get the most recent conversation
    const { data: conversations, error: convError } = await supabaseService()
      .from('conversations')
      .select('session_id, user_name, started_at, conversation_data, status')
      .order('started_at', { ascending: false })
      .limit(3);

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }

    if (!conversations || conversations.length === 0) {
      console.log('❌ No conversations found');
      return;
    }

    console.log(`📋 Found ${conversations.length} recent conversations:`);
    conversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ${conv.user_name} - ${conv.session_id} (${conv.started_at})`);
    });
    console.log('');

    // Investigate the most recent conversation
    const latestConv = conversations[0];
    console.log(`🔍 Investigating latest conversation: ${latestConv.session_id}`);
    console.log(`👤 User: ${latestConv.user_name}`);
    console.log(`📅 Started: ${latestConv.started_at}`);
    console.log(`📊 Status: ${latestConv.status}`);
    console.log('');

    // Check conversation_data structure
    const conversationData = latestConv.conversation_data || {};
    console.log('📋 Conversation Data Structure:');
    console.log('  Keys:', Object.keys(conversationData));
    
    if (conversationData.turns) {
      console.log(`  Turns count: ${conversationData.turns.length}`);
      console.log('');

      console.log('🔍 DETAILED TURN ANALYSIS:');
      console.log('Turn# | Speaker | Turn_Number | Message Preview | Timestamp');
      console.log('------|---------|-------------|-----------------|----------');
      
      conversationData.turns.forEach((turn, index) => {
        const preview = turn.message ? turn.message.substring(0, 50) + '...' : 'No message';
        const timestamp = turn.timestamp || 'No timestamp';
        const turnNumber = turn.turn_number || 'No turn_number';
        
        console.log(`${String(index + 1).padStart(5)} | ${String(turn.speaker || 'Unknown').padEnd(7)} | ${String(turnNumber).padEnd(11)} | ${preview.padEnd(50)} | ${timestamp}`);
      });
      console.log('');

      // Check for ordering issues
      console.log('🚨 ORDERING ANALYSIS:');
      let orderingIssues = [];
      
      for (let i = 0; i < conversationData.turns.length - 1; i++) {
        const currentTurn = conversationData.turns[i];
        const nextTurn = conversationData.turns[i + 1];
        
        // Check if turn numbers are sequential
        if (currentTurn.turn_number && nextTurn.turn_number) {
          if (nextTurn.turn_number <= currentTurn.turn_number) {
            orderingIssues.push(`Turn ${i + 1} -> ${i + 2}: turn_number goes from ${currentTurn.turn_number} to ${nextTurn.turn_number} (should increase)`);
          }
        }
        
        // Check for speaker pattern issues
        if (currentTurn.speaker === nextTurn.speaker && currentTurn.speaker === 'user') {
          orderingIssues.push(`Turn ${i + 1} -> ${i + 2}: Two consecutive user messages`);
        }
      }
      
      if (orderingIssues.length > 0) {
        console.log('❌ FOUND ORDERING ISSUES:');
        orderingIssues.forEach(issue => console.log(`  - ${issue}`));
      } else {
        console.log('✅ No obvious ordering issues found in turn_number sequence');
      }
      console.log('');

      // Check timestamps if available
      console.log('⏰ TIMESTAMP ANALYSIS:');
      const turnsWithTimestamps = conversationData.turns.filter(turn => turn.timestamp);
      if (turnsWithTimestamps.length > 0) {
        console.log(`Found ${turnsWithTimestamps.length} turns with timestamps`);
        
        // Check if timestamps are in order
        let timestampIssues = [];
        for (let i = 0; i < turnsWithTimestamps.length - 1; i++) {
          const current = new Date(turnsWithTimestamps[i].timestamp).getTime();
          const next = new Date(turnsWithTimestamps[i + 1].timestamp).getTime();
          
          if (next < current) {
            timestampIssues.push(`Timestamp order issue: Turn with "${turnsWithTimestamps[i].message?.substring(0, 30)}..." comes before "${turnsWithTimestamps[i + 1].message?.substring(0, 30)}..." but has later timestamp`);
          }
        }
        
        if (timestampIssues.length > 0) {
          console.log('❌ TIMESTAMP ORDERING ISSUES:');
          timestampIssues.forEach(issue => console.log(`  - ${issue}`));
        } else {
          console.log('✅ Timestamps appear to be in correct order');
        }
      } else {
        console.log('⚠️ No timestamps found in turns');
      }
      console.log('');

      // Show the actual conversation flow
      console.log('💬 ACTUAL CONVERSATION FLOW (as stored):');
      conversationData.turns.forEach((turn, index) => {
        const speaker = turn.speaker === 'user' ? 'User' : 'AI';
        const message = turn.message || 'No message';
        const turnNum = turn.turn_number || '?';
        console.log(`${index + 1}. [Turn ${turnNum}] ${speaker}: ${message}`);
      });

    } else {
      console.log('❌ No turns found in conversation_data');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateTranscriptOrdering().catch(console.error);
