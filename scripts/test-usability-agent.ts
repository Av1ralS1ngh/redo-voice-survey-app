// Quick test for Usability Testing Agent configuration
// Validates that the agent is properly structured

import { usabilityTestingAgent } from '../src/lib/agents/usability-testing-agent';

console.log('🧪 Testing Usability Testing Agent Configuration\n');
console.log('='.repeat(60));

let passedTests = 0;
let totalTests = 0;

function test(name: string, condition: boolean) {
  totalTests++;
  if (condition) {
    console.log(`✅ ${name}`);
    passedTests++;
  } else {
    console.log(`❌ ${name}`);
  }
}

// Test 1: Agent basics
console.log('\n📋 Basic Configuration');
console.log('-'.repeat(60));
test('Agent has ID', !!usabilityTestingAgent.id);
test('ID is usability_testing', usabilityTestingAgent.id === 'usability_testing');
test('Agent has name', !!usabilityTestingAgent.name);
test('Agent has description', !!usabilityTestingAgent.description);

// Test 2: System prompt
console.log('\n📝 System Prompt');
console.log('-'.repeat(60));
test('Has system prompt', !!usabilityTestingAgent.systemPrompt);
test('System prompt includes key references', usabilityTestingAgent.systemPrompt.includes('<key_references>'));
test('System prompt includes Nielsen 5-user rule', usabilityTestingAgent.systemPrompt.includes('85%'));
test('System prompt includes clarification protocol', usabilityTestingAgent.systemPrompt.includes('CLARIFICATION PROTOCOL'));
test('System prompt includes conversation stages', usabilityTestingAgent.systemPrompt.includes('Stage 1'));
test('System prompt length is substantial', usabilityTestingAgent.systemPrompt.length > 5000);

// Test 3: Brief template
console.log('\n📄 Brief Template');
console.log('-'.repeat(60));
test('Has brief template', !!usabilityTestingAgent.briefTemplate);
test('Template has sections', Array.isArray(usabilityTestingAgent.briefTemplate.sections));
test('Has 7 sections', usabilityTestingAgent.briefTemplate.sections.length === 7);
test('All sections have IDs', usabilityTestingAgent.briefTemplate.sections.every(s => !!s.id));
test('All sections have titles', usabilityTestingAgent.briefTemplate.sections.every(s => !!s.title));
test('All sections are required', usabilityTestingAgent.briefTemplate.sections.every(s => s.required === true));

console.log('\n  Section breakdown:');
usabilityTestingAgent.briefTemplate.sections.forEach(section => {
  console.log(`    • ${section.title} (${section.contentType})`);
});

// Test 4: Conversation flow
console.log('\n💬 Conversation Flow');
console.log('-'.repeat(60));
test('Has conversation flow', !!usabilityTestingAgent.conversationFlow);
test('Has opening style', !!usabilityTestingAgent.conversationFlow.openingStyle);
test('Opening style is conversational', usabilityTestingAgent.conversationFlow.openingStyle === 'conversational');
test('Has question style', !!usabilityTestingAgent.conversationFlow.questionStyle);
test('Question style is open-ended', usabilityTestingAgent.conversationFlow.questionStyle === 'open-ended');
test('Has follow-up strategy', !!usabilityTestingAgent.conversationFlow.followUpStrategy);
test('Follow-up strategy is adaptive', usabilityTestingAgent.conversationFlow.followUpStrategy === 'adaptive');
test('Has conversation structure', Array.isArray(usabilityTestingAgent.conversationFlow.structure));
test('Has 5 conversation phases', usabilityTestingAgent.conversationFlow.structure?.length === 5);

if (usabilityTestingAgent.conversationFlow.structure) {
  console.log('\n  Conversation phases:');
  usabilityTestingAgent.conversationFlow.structure.forEach((phase, idx) => {
    console.log(`    ${idx + 1}. ${phase.phase} (${phase.durationPercent}%)`);
    console.log(`       Focus: ${phase.focus}`);
  });
}

// Test 5: Question strategy
console.log('\n❓ Question Strategy');
console.log('-'.repeat(60));
test('Has question strategy', !!usabilityTestingAgent.questionStrategy);
test('Uses AI-generated follow-ups', usabilityTestingAgent.questionStrategy?.followUpLogic === 'ai-generated');
test('Has max follow-up depth', typeof usabilityTestingAgent.questionStrategy?.maxFollowUpDepth === 'number');
test('Allows custom questions', usabilityTestingAgent.questionStrategy?.allowCustomQuestions === true);

// Test 6: Key references embedded
console.log('\n📚 Key References');
console.log('-'.repeat(60));
const references = [
  { name: "Nielsen's 5-User Testing", keyword: "85%" },
  { name: 'Think-Aloud Protocol', keyword: 'Concurrent Think-Aloud' },
  { name: 'Task Scenario Design', keyword: 'NEVER use interface language' },
  { name: 'ISO 9241-11 Metrics', keyword: 'ISO 9241-11' },
  { name: 'Remote Testing', keyword: '10-15 min buffer' }
];

references.forEach(ref => {
  test(`Includes ${ref.name}`, usabilityTestingAgent.systemPrompt.includes(ref.keyword));
});

// Test 7: Format validation
console.log('\n🔧 Format Validation');
console.log('-'.repeat(60));
test('Brief format is markdown', usabilityTestingAgent.briefTemplate.format === 'markdown');
test('Includes examples', usabilityTestingAgent.briefTemplate.includeExamples === true);

// Summary
console.log('\n' + '='.repeat(60));
console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);

if (passedTests === totalTests) {
  console.log('✅ All tests passed! Agent is properly configured.\n');
  console.log('Ready to proceed with:');
  console.log('  1. Brief generator implementation');
  console.log('  2. Hume prompt generator');
  console.log('  3. Agent registration');
  console.log('  4. UI integration\n');
  process.exit(0);
} else {
  console.log(`❌ ${totalTests - passedTests} test(s) failed. Review configuration.\n`);
  process.exit(1);
}

