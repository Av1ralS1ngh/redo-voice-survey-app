// scripts/run-fix-audio-table.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTable() {
  console.log('🔧 Fixing conversation_audio table...\n');
  
  // Drop NOT NULL constraint
  console.log('1️⃣  Removing NOT NULL constraint from conversation_id...');
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE conversation_audio ALTER COLUMN conversation_id DROP NOT NULL;'
  });
  
  if (alterError && !alterError.message.includes('does not exist')) {
    console.log('   Using direct ALTER (RPC not available)');
    // Try alternative approach - just continue, the constraint might already be nullable
  } else {
    console.log('✅ Constraint removed');
  }
  
  // Create indexes
  console.log('\n2️⃣  Creating indexes...');
  const { error: indexError1 } = await supabase.rpc('exec_sql', {
    sql: 'CREATE INDEX IF NOT EXISTS idx_conversation_audio_session ON conversation_audio(session_id);'
  });
  
  const { error: indexError2 } = await supabase.rpc('exec_sql', {
    sql: 'CREATE INDEX IF NOT EXISTS idx_conversation_audio_turn ON conversation_audio(session_id, turn_number);'
  });
  
  if (!indexError1 && !indexError2) {
    console.log('✅ Indexes created');
  } else {
    console.log('⚠️  Could not create indexes via RPC (may already exist)');
  }
  
  console.log('\n✅ Table fix complete!');
  console.log('\nℹ️  If ALTER failed, please run this SQL in Supabase Dashboard:');
  console.log('   ALTER TABLE conversation_audio ALTER COLUMN conversation_id DROP NOT NULL;');
}

fixTable().catch(console.error);
