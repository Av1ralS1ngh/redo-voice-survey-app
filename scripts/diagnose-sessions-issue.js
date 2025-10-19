// Quick diagnostic for sessions table issue
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 DIAGNOSING SESSIONS TABLE ISSUE\n');
  console.log('='.repeat(60));
  
  // 1. Check if sessions table exists
  console.log('\n1️⃣  Checking if sessions table exists...');
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .limit(1);
  
  if (sessionsError) {
    console.log('❌ Sessions table error:', sessionsError.message);
    console.log('   Code:', sessionsError.code);
  } else {
    console.log('✅ Sessions table exists');
    if (sessions && sessions.length > 0) {
      console.log('   Columns:', Object.keys(sessions[0]).join(', '));
    }
  }
  
  // 2. Get a known user
  console.log('\n2️⃣  Getting user bc820345...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, uid, name')
    .eq('uid', 'bc820345')
    .single();
  
  if (userError) {
    console.log('❌ User error:', userError.message);
    return;
  }
  
  console.log('✅ User found:');
  console.log('   ID (UUID):', user.id);
  console.log('   UID:', user.uid);
  console.log('   Name:', user.name);
  
  // 3. Try to insert a test session
  console.log('\n3️⃣  Attempting to insert test session...');
  const testSessionId = crypto.randomUUID();
  
  const { data: newSession, error: insertError } = await supabase
    .from('sessions')
    .insert({
      id: testSessionId,
      user_id: user.id,
      started_at: new Date().toISOString()
    })
    .select();
  
  if (insertError) {
    console.log('❌ Insert failed:');
    console.log('   Message:', insertError.message);
    console.log('   Code:', insertError.code);
    console.log('   Details:', insertError.details);
    console.log('   Hint:', insertError.hint);
    
    // Try with minimal fields
    console.log('\n4️⃣  Trying with just user_id...');
    const { data: minimalSession, error: minimalError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id
      })
      .select();
    
    if (minimalError) {
      console.log('❌ Minimal insert also failed:', minimalError.message);
    } else {
      console.log('✅ Minimal insert worked!', minimalSession);
    }
  } else {
    console.log('✅ Session inserted successfully!');
    console.log('   Session ID:', newSession[0].id);
    console.log('   User ID:', newSession[0].user_id);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 DIAGNOSIS COMPLETE\n');
}

diagnose().catch(console.error);
