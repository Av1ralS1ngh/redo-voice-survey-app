// Quick script to verify if the columns exist in the database
require('dotenv').config({ path: '.env.local' });

async function verifyColumns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        query: `
          SELECT 
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns
          WHERE table_name = 'interviews'
            AND column_name IN (
              'workflow_state',
              'research_brief',
              'hume_system_prompt',
              'interview_guide',
              'agent_type',
              'agent_config'
            )
          ORDER BY column_name;
        `
      })
    }
  );

  const data = await response.json();
  console.log('\n📊 Interview Table Columns:');
  console.log(JSON.stringify(data, null, 2));
}

verifyColumns().catch(console.error);
