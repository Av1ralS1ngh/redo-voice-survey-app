/**
 * Clean Demo Account
 * 
 * Deletes all projects and interviews for the demo user
 * Run this before demos to get a clean slate
 * 
 * Run: npx tsx scripts/clean-demo-account.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const DEMO_USER_EMAIL = 'demo@voicesurvey.com';

async function cleanDemoAccount() {
  console.log('🧹 Cleaning demo account...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Get demo user's auth ID
    console.log('1️⃣  Finding demo user...');
    const { data: users } = await supabase.auth.admin.listUsers();
    const demoUser = users?.users.find(u => u.email === DEMO_USER_EMAIL);

    if (!demoUser) {
      console.log('⚠️  Demo user not found!');
      console.log('Create one with: npx tsx scripts/create-demo-user.ts');
      process.exit(0);
    }

    console.log(`✅ Found demo user: ${demoUser.id}\n`);

    // Get all demo user's projects
    console.log('2️⃣  Finding projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .or(`user_id.eq.${demoUser.id},auth_user_id.eq.${demoUser.id}`);

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      console.log('✅ No projects found - account is already clean!\n');
      process.exit(0);
    }

    console.log(`Found ${projects.length} projects to delete\n`);

    // Delete interviews for each project
    console.log('3️⃣  Deleting interviews...');
    const projectIds = projects.map(p => p.id);
    
    const { data: deletedInterviews, error: interviewsError } = await supabase
      .from('interviews')
      .delete()
      .in('project_id', projectIds)
      .select('id');

    if (interviewsError) {
      console.error('⚠️  Error deleting interviews:', interviewsError.message);
    } else {
      console.log(`✅ Deleted ${deletedInterviews?.length || 0} interviews\n`);
    }

    // Delete all projects
    console.log('4️⃣  Deleting projects...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .in('id', projectIds);

    if (deleteError) {
      throw new Error(`Failed to delete projects: ${deleteError.message}`);
    }

    console.log(`✅ Deleted ${projects.length} projects\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Demo account cleaned!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Deleted: ${projects.length} projects`);
    console.log(`   Deleted: ${deletedInterviews?.length || 0} interviews`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎬 Ready for your demo!\n');

  } catch (error) {
    console.error('\n❌ Cleanup failed:');
    console.error(error);
    process.exit(1);
  }
}

cleanDemoAccount();

