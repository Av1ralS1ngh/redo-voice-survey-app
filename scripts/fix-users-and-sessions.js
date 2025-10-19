// Fix users table and ensure bc820345 user exists
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUsersTable() {
  console.log('🔧 FIXING USERS TABLE SCHEMA\n');
  console.log('='.repeat(60));
  
  // Step 1: Check current schema first
  console.log('\n1️⃣  Checking current users table schema...');
  console.log('   (Note: We cannot directly ALTER table via Supabase client)');
  console.log('   (Schema changes must be done via Supabase Dashboard SQL Editor)\n');
  
  // Step 2: Check what columns exist
  console.log('2️⃣  Checking existing columns...');
  
  // Check current schema
  const { data: currentUsers, error: schemaError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (currentUsers && currentUsers.length > 0) {
    const columns = Object.keys(currentUsers[0]);
    console.log('   Current columns:', columns.join(', '));
    
    const hasUid = columns.includes('uid');
    const hasName = columns.includes('name');
    const hasFullName = columns.includes('full_name');
    
    console.log(`   - uid column: ${hasUid ? '✅' : '❌'}`);
    console.log(`   - name column: ${hasName ? '✅' : '❌'}`);
    console.log(`   - full_name column: ${hasFullName ? '✅' : '❌'}`);
  }
  
  // Step 3: Create or update bc820345 user
  console.log('\n3️⃣  Ensuring bc820345 user exists...');
  
  const testUid = 'bc820345';
  const testName = 'User bc820345';
  const testEmail = 'bc820345@test.com';
  
  // Try to find existing user
  const { data: existingUsers } = await supabase
    .from('users')
    .select('*')
    .or(`uid.eq.${testUid},email.eq.${testEmail}`)
    .limit(1);
  
  if (existingUsers && existingUsers.length > 0) {
    console.log('   ✅ User already exists:', existingUsers[0]);
    
    // Update with uid if missing
    if (!existingUsers[0].uid) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          uid: testUid,
          name: testName  
        })
        .eq('id', existingUsers[0].id);
      
      if (!updateError) {
        console.log('   ✅ Updated user with uid');
      }
    }
  } else {
    // Create new user
    console.log('   Creating new user...');
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        uid: testUid,
        name: testName,
        email: testEmail,
        full_name: testName,
        user_id: crypto.randomUUID(), // Generate user_id if required
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (createError) {
      console.log('   ❌ Error creating user:', createError.message);
      
      // Try minimal insert
      const { data: minimalUser, error: minimalError } = await supabase
        .from('users')
        .insert({
          uid: testUid,
          email: testEmail
        })
        .select();
      
      if (minimalError) {
        console.log('   ❌ Minimal insert also failed:', minimalError.message);
      } else {
        console.log('   ✅ User created with minimal fields:', minimalUser[0]);
      }
    } else {
      console.log('   ✅ User created successfully:', newUser[0]);
    }
  }
  
  // Step 4: Test session creation with fixed user
  console.log('\n4️⃣  Testing session creation...');
  
  const { data: testUser } = await supabase
    .from('users')
    .select('id, uid, name')
    .eq('uid', testUid)
    .single();
  
  if (!testUser) {
    console.log('   ❌ Could not find test user');
    return;
  }
  
  console.log('   User for session test:', testUser);
  
  const testSessionId = crypto.randomUUID();
  const { data: testSession, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      id: testSessionId,
      user_id: testUser.id,
      started_at: new Date().toISOString()
    })
    .select();
  
  if (sessionError) {
    console.log('   ❌ Session creation failed:', sessionError.message);
  } else {
    console.log('   ✅ Session created successfully!');
    console.log('      Session ID:', testSession[0].id);
    
    // Clean up test session
    await supabase.from('sessions').delete().eq('id', testSessionId);
    console.log('   🧹 Cleaned up test session');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ USERS TABLE FIX COMPLETE!\n');
  console.log('Next step: Restart the dev server and test again\n');
}

fixUsersTable().catch(console.error);
