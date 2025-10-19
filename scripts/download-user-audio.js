// Download user turn audio files for testing
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sessionId = process.argv[2] || 'df663c88-f133-4cb2-ac10-6d0656e38c9c';

(async () => {
  console.log('🔍 Fetching user turn audio files...\n');
  console.log(`Session ID: ${sessionId}\n`);
  
  const { data: audioFiles, error } = await supabase
    .from('conversation_audio')
    .select('turn_number, speaker, audio_url, audio_duration')
    .eq('session_id', sessionId)
    .eq('speaker', 'user')
    .order('turn_number');
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  if (!audioFiles || audioFiles.length === 0) {
    console.log('⚠️  No user audio files found for this session');
    console.log('Run the turn extraction first:');
    console.log('  npx tsx scripts/test-turn-extraction.ts');
    process.exit(0);
  }
  
  console.log(`Found ${audioFiles.length} user audio files:\n`);
  
  const downloadDir = path.join(process.cwd(), 'test-audio-files');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  for (const file of audioFiles) {
    console.log(`📁 Turn ${file.turn_number} (user):`);
    console.log(`   URL: ${file.audio_url}`);
    console.log(`   Duration: ${file.audio_duration || 'N/A'}`);
    
    const fileName = `turn-${file.turn_number}-user.mp3`;
    const filePath = path.join(downloadDir, fileName);
    
    const fileStream = fs.createWriteStream(filePath);
    
    await new Promise((resolve, reject) => {
      https.get(file.audio_url, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          const stats = fs.statSync(filePath);
          console.log(`   ✅ Downloaded: ${filePath} (${(stats.size / 1024).toFixed(2)} KB)\n`);
          resolve();
        });
      }).on('error', (err) => {
        console.error(`   ❌ Download failed: ${err.message}`);
        reject(err);
      });
    }).catch(() => {});
  }
  
  console.log(`\n✅ All user audio files saved to: ${downloadDir}\n`);
  console.log('🎵 Play them with:');
  audioFiles.forEach(f => {
    console.log(`  afplay test-audio-files/turn-${f.turn_number}-user.mp3`);
  });
})();
