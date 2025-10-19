#!/bin/bash
# Direct check using curl to bypass Node.js dependencies

source .env.local

curl -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''interviews'\'' AND column_name IN ('\''workflow_state'\'', '\''research_brief'\'', '\''hume_system_prompt'\'', '\''interview_guide'\'', '\''agent_type'\'', '\''agent_config'\'') ORDER BY column_name;"
  }' 2>/dev/null | python3 -m json.tool

