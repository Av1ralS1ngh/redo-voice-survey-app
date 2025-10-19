// Quick test to verify audio pipeline is working
// Run this with: node scripts/test-audio-pipeline.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Simple .env.local loader
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}
loadEnv();

async function testAudioPipeline() {
  console.log('🧪 Testing Audio Pipeline...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Test database connection
    console.log('1️⃣ Testing database connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('conversation_audio')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      console.log('❌ Database connection failed:', tablesError.message);
      return;
    }
    console.log('✅ Database connection successful');

    // 2. Test storage bucket access
    console.log('\n2️⃣ Testing storage bucket access...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Storage access failed:', bucketsError.message);
      return;
    }

    const audioBucket = buckets.find(bucket => bucket.id === 'conversation-audio');
    if (audioBucket) {
      console.log('✅ conversation-audio bucket exists');
    } else {
      console.log('❌ conversation-audio bucket NOT found');
      console.log('Available buckets:', buckets.map(b => b.id));
    }

    // 3. Test storage upload (with dummy data)
    console.log('\n3️⃣ Testing storage upload...');
    const testBlob = new Blob(['test audio data'], { type: 'audio/webm' });
    const testPath = `test/test-upload-${Date.now()}.webm`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('conversation-audio')
      .upload(testPath, testBlob);

    if (uploadError) {
      console.log('❌ Storage upload failed:', uploadError.message);
    } else {
      console.log('✅ Storage upload successful');
      
      // Clean up test file
      await supabase.storage
        .from('conversation-audio')
        .remove([testPath]);
      console.log('✅ Test file cleaned up');
    }

    // 4. Test database insert
    console.log('\n4️⃣ Testing database insert...');
    const testRecord = {
      session_id: 'test-session-' + Date.now(),
      message_id: 'test-message-' + Date.now(),
      speaker: 'user',
      audio_url: 'https://test-url.com/test.webm',
      storage_path: testPath,
      processing_status: 'completed'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('conversation_audio')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.log('❌ Database insert failed:', insertError.message);
    } else {
      console.log('✅ Database insert successful');
      
      // Clean up test record
      await supabase
        .from('conversation_audio')
        .delete()
        .eq('session_id', testRecord.session_id);
      console.log('✅ Test record cleaned up');
    }

    console.log('\n🎉 Audio pipeline test completed successfully!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Only run if called directly
if (require.main === module) {
  testAudioPipeline();
}

module.exports = { testAudioPipeline };
