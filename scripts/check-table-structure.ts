import { createClient } from '@supabase/supabase-js';

async function checkTables() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  console.log('🔍 Checking Supabase table structures...\n');

  // Check conversation_chat_metadata table structure
  const { data: metadata, error: metadataError } = await supabase
    .from('conversation_chat_metadata')
    .select('*')
    .limit(1);
  
  console.log('📊 conversation_chat_metadata table:');
  if (metadataError) {
    console.log('  ❌ Error:', metadataError.message);
  } else {
    console.log('  ✅ Sample row:', JSON.stringify(metadata, null, 2));
  }

  // Check sessions table
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .limit(1);
  
  console.log('\n📊 sessions table:');
  if (sessionsError) {
    console.log('  ❌ Error:', sessionsError.message);
  } else {
    console.log('  ✅ Sample row:', JSON.stringify(sessions, null, 2));
  }

  // Check conversations table
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*')
    .limit(1);
  
  console.log('\n📊 conversations table:');
  if (conversationsError) {
    console.log('  ❌ Error:', conversationsError.message);
  } else {
    console.log('  ✅ Sample row:', JSON.stringify(conversations, null, 2));
  }

  // Check the most recent chat metadata
  const { data: recentMetadata } = await supabase
    .from('conversation_chat_metadata')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log('\n📋 Recent chat metadata entries:');
  console.log(JSON.stringify(recentMetadata, null, 2));
}

checkTables().catch(console.error);
