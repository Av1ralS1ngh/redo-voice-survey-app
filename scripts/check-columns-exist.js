// Check if the columns actually exist in Supabase
require('dotenv').config({ path: '.env.local' });

async function checkColumns() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('\n🔍 Checking if columns exist in interviews table...\n');
  
  // Try to query with all the new columns
  const { data, error } = await supabase
    .from('interviews')
    .select('id, workflow_state, research_brief, hume_system_prompt, interview_guide, agent_type, agent_config')
    .limit(1);
  
  if (error) {
    console.log('❌ ERROR querying columns:', error);
    console.log('\nThis suggests the columns may not exist in the database.');
  } else {
    console.log('✅ SUCCESS: All columns exist!');
    console.log('\nSample data:', JSON.stringify(data, null, 2));
  }
  
  // Also try a direct SQL query via REST API
  console.log('\n🔍 Checking column schema via information_schema...\n');
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = 'interviews'
            AND column_name IN ('workflow_state', 'research_brief', 'hume_system_prompt', 'interview_guide', 'agent_type', 'agent_config')
          ORDER BY column_name;
        `
      })
    }
  );
  
  const result = await response.json();
  console.log('Schema check result:', JSON.stringify(result, null, 2));
}

checkColumns().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
