/**
 * Create Demo User
 * 
 * Creates a clean demo user account for demonstrations
 * Email: demo@voicesurvey.com
 * Password: demo123
 * 
 * Run: npx tsx scripts/create-demo-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const DEMO_USER_EMAIL = 'demo@voicesurvey.com';
const DEMO_USER_PASSWORD = 'demo123';
const DEMO_UID = 'demo-user';

async function createDemoUser() {
  console.log('🎬 Creating demo user...\n');

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase client with service role (admin privileges)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ============================================
    // Step 1: Check if demo auth user already exists
    // ============================================
    console.log(`1️⃣  Checking if demo user exists: ${DEMO_USER_EMAIL}`);
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === DEMO_USER_EMAIL);

    let authUserId: string;

    if (existingUser) {
      console.log(`⚠️  Demo user already exists: ${existingUser.id}`);
      console.log(`Deleting existing demo user to create fresh...`);
      
      // Delete existing user and all their data
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      
      if (deleteError) {
        console.error('Warning: Could not delete existing user:', deleteError.message);
      } else {
        console.log('✅ Deleted existing demo user');
      }
    }

    // Create new demo auth user
    console.log(`\n2️⃣  Creating fresh demo auth user...`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
      email_confirm: true, // Auto-confirm for easy login
    });

    if (authError) {
      throw new Error(`Failed to create demo auth user: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Auth user created but no user data returned');
    }

    authUserId = authData.user.id;
    console.log(`✅ Created demo auth user: ${authUserId}`);

    // ============================================
    // Step 2: Create app user record
    // ============================================
    console.log(`\n3️⃣  Creating demo app user record...`);
    
    // Check if app user exists
    const { data: existingAppUser } = await supabase
      .from('users')
      .select('id')
      .eq('uid', DEMO_UID)
      .single();

    if (existingAppUser) {
      // Delete existing app user
      await supabase.from('users').delete().eq('uid', DEMO_UID);
      console.log('Deleted existing app user record');
    }

    // Create new app user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: authUserId, // Use auth user ID as the primary key
        uid: DEMO_UID,
        name: 'Demo User',
        email: DEMO_USER_EMAIL,
        auth_id: authUserId,
        user_id: authUserId, // If user_id column exists and is required
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create app user: ${createError.message}`);
    }

    console.log(`✅ Created app user: ${newUser.id}`);

    // ============================================
    // Step 3: Verify no projects exist
    // ============================================
    console.log(`\n4️⃣  Verifying clean state...`);
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .or(`user_id.eq.${authUserId},auth_user_id.eq.${authUserId}`);

    if (projectsError) {
      console.log(`⚠️  Could not check projects: ${projectsError.message}`);
    } else {
      console.log(`✅ Projects count: ${projects?.length || 0} (should be 0)`);
    }

    // ============================================
    // Success!
    // ============================================
    console.log(`\n✅ Demo user created successfully!\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎬 Demo User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${DEMO_USER_EMAIL}`);
    console.log(`   Password: ${DEMO_USER_PASSWORD}`);
    console.log(`   Auth ID:  ${authUserId}`);
    console.log(`   App UID:  ${DEMO_UID}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Next steps:');
    console.log('   1. Log out from current account');
    console.log('   2. Log in with demo credentials');
    console.log('   3. Create sample projects for demo\n');

  } catch (error) {
    console.error('\n❌ Demo user creation failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the function
createDemoUser();

