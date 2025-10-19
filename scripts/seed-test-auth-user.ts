/**
 * Seed Test Authentication User
 * 
 * This script:
 * 1. Creates a test auth user in Supabase
 * 2. Links existing 'bc820345' user to the auth user
 * 3. Migrates existing projects to use auth user id
 * 
 * Run: npx tsx scripts/seed-test-auth-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const TEST_USER_EMAIL = 'test@voicesurvey.com';
const TEST_USER_PASSWORD = 'test123';
const EXISTING_UID = 'bc820345'; // The hardcoded user we want to link

async function seedTestUser() {
  console.log('🔐 Starting test user seed process...\n');

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
    // Step 1: Check if auth user already exists
    // ============================================
    console.log(`1️⃣  Checking if auth user exists: ${TEST_USER_EMAIL}`);
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === TEST_USER_EMAIL);

    let authUserId: string;

    if (existingUser) {
      console.log(`✅ Auth user already exists: ${existingUser.id}`);
      authUserId = existingUser.id;
    } else {
      // Create new auth user
      console.log(`Creating new auth user...`);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        email_confirm: true, // Auto-confirm for testing
      });

      if (authError) {
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Auth user created but no user data returned');
      }

      authUserId = authData.user.id;
      console.log(`✅ Created auth user: ${authUserId}\n`);
    }

    // ============================================
    // Step 2: Update existing app user with auth_id
    // ============================================
    console.log(`2️⃣  Linking app user '${EXISTING_UID}' to auth user...`);
    
    // Check if user exists
    const { data: existingAppUser, error: checkError } = await supabase
      .from('users')
      .select('id, uid, name, auth_id')
      .eq('uid', EXISTING_UID)
      .single();

    if (checkError || !existingAppUser) {
      console.log(`⚠️  User '${EXISTING_UID}' not found. Creating new user...`);
      
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          uid: EXISTING_UID,
          name: 'Test User',
          email: TEST_USER_EMAIL,
          auth_id: authUserId,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      console.log(`✅ Created new user: ${newUser.id}\n`);
    } else {
      // Update existing user
      if (existingAppUser.auth_id === authUserId) {
        console.log(`✅ User already linked to auth user\n`);
      } else {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            auth_id: authUserId,
            email: TEST_USER_EMAIL 
          })
          .eq('uid', EXISTING_UID);

        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`);
        }

        console.log(`✅ Linked user '${EXISTING_UID}' to auth user ${authUserId}\n`);
      }
    }

    // ============================================
    // Step 3: Migrate projects to use auth_user_id
    // ============================================
    console.log(`3️⃣  Migrating projects to use auth user ID...`);
    
    // Check if projects have auth_user_id column
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, user_id, auth_user_id')
      .eq('user_id', EXISTING_UID);

    if (projectsError) {
      console.log(`⚠️  Could not fetch projects: ${projectsError.message}`);
      console.log(`This is OK if no projects exist yet.\n`);
    } else if (projects && projects.length > 0) {
      console.log(`Found ${projects.length} projects to migrate`);

      // Check if auth_user_id column exists
      const hasAuthUserIdColumn = 'auth_user_id' in projects[0];

      if (hasAuthUserIdColumn) {
        const { error: migrateError } = await supabase
          .from('projects')
          .update({ auth_user_id: authUserId })
          .eq('user_id', EXISTING_UID);

        if (migrateError) {
          throw new Error(`Failed to migrate projects: ${migrateError.message}`);
        }

        console.log(`✅ Migrated ${projects.length} projects to auth user ${authUserId}\n`);
      } else {
        console.log(`⚠️  auth_user_id column does not exist yet`);
        console.log(`Run the column migration step first (see AUTH_IMPLEMENTATION_PLAN.md)\n`);
      }
    } else {
      console.log(`No projects found for user '${EXISTING_UID}'\n`);
    }

    // ============================================
    // Step 4: Verify setup
    // ============================================
    console.log(`4️⃣  Verifying setup...`);
    
    const { data: verifyUser } = await supabase
      .from('users')
      .select('id, uid, name, email, auth_id')
      .eq('uid', EXISTING_UID)
      .single();

    console.log(`\n✅ Setup complete!\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${TEST_USER_EMAIL}`);
    console.log(`   Password: ${TEST_USER_PASSWORD}`);
    console.log(`   Auth ID:  ${authUserId}`);
    console.log(`   App UID:  ${EXISTING_UID}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Next steps:');
    console.log('   1. Test login at /login');
    console.log('   2. Verify projects are visible');
    console.log('   3. Create a new project to test RLS\n');

  } catch (error) {
    console.error('\n❌ Seed process failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the seed function
seedTestUser();

