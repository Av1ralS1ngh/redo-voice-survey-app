/**
 * Usability Testing Agent Integration Test
 * Validates that all components work together
 */

import { getAgentByType, validateInterviewType } from '../src/lib/interview-types/registry';

console.log('🧪 Testing Usability Testing Agent Integration\n');
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

// Test 1: Registry
console.log('\n📋 Registry Integration');
console.log('-'.repeat(60));

const validation = validateInterviewType('usability_testing');
test('Interview type is registered', validation.valid);
test('No validation errors', validation.errors.length === 0);

const agent = getAgentByType('usability_testing');
test('Agent can be retrieved from registry', !!agent);
test('Agent has correct ID', agent?.getId() === 'usability_testing');
test('Agent has correct name', agent?.getName() === 'Usability Testing');

// Test 2: Configuration
console.log('\n⚙️  Agent Configuration');
console.log('-'.repeat(60));

if (agent) {
  const config = agent.getConfig();
  test('Has system prompt', !!config.systemPrompt);
  test('System prompt includes references', config.systemPrompt.includes('<key_references>'));
  test('System prompt includes Nielsen', config.systemPrompt.includes('85%'));
  test('System prompt includes ISO', config.systemPrompt.includes('ISO 9241-11'));
  test('Has brief template', !!config.briefTemplate);
  test('Has 7 brief sections', config.briefTemplate.sections.length === 7);
  test('Has conversation flow', !!config.conversationFlow);
  test('Has question strategy', !!config.questionStrategy);
}

// Test 3: Methods
console.log('\n🔧 Agent Methods');
console.log('-'.repeat(60));

if (agent) {
  test('Has generateBrief method', typeof (agent as any).generateBrief === 'function');
  test('Has refineBrief method', typeof (agent as any).refineBrief === 'function');
  test('Has generateHumePrompt method', typeof (agent as any).generateHumePrompt === 'function');
  
  const welcomeMsg = agent.generateWelcomeMessage();
  test('Can generate welcome message', !!welcomeMsg);
  test('Welcome message has content', !!welcomeMsg.content);
  test('Welcome message is from assistant', welcomeMsg.role === 'assistant');
}

// Test 4: Type System
console.log('\n📝 TypeScript Type Compatibility');
console.log('-'.repeat(60));

try {
  // Import types to verify they compile
  const { usabilityTestingConfig } = require('../src/lib/interview-types/agents/usability-testing-agent');
  test('Config exports successfully', !!usabilityTestingConfig);
  test('Config has agent', !!usabilityTestingConfig.agent);
  test('Config has workflow', !!usabilityTestingConfig.workflow);
  test('Config has UI settings', !!usabilityTestingConfig.ui);
  test('Config has metadata', !!usabilityTestingConfig.metadata);
  test('Config is marked active', usabilityTestingConfig.metadata.isActive === true);
} catch (error) {
  test('Config exports successfully', false);
  console.error('  Error:', error);
}

// Test 5: Workflow
console.log('\n🔄 Workflow Configuration');
console.log('-'.repeat(60));

try {
  const { usabilityTestingConfig } = require('../src/lib/interview-types/agents/usability-testing-agent');
  const workflow = usabilityTestingConfig.workflow;
  
  test('Has workflow steps', workflow.steps.length > 0);
  test('Has project-brief step', workflow.steps.some((s: any) => s.id === 'project-brief'));
  test('Has voice-settings step', workflow.steps.some((s: any) => s.id === 'voice-settings'));
  test('Has launch step', workflow.steps.some((s: any) => s.id === 'launch'));
  test('Steps are ordered', workflow.steps.every((s: any, i: number) => s.order === i + 1));
  test('Has required fields', workflow.requiredFields.length > 0);
} catch (error) {
  console.error('  Error:', error);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);

if (passedTests === totalTests) {
  console.log('✅ All tests passed! Usability Testing Agent is fully integrated.\n');
  console.log('🎉 Ready for E2E testing!');
  console.log('\nNext steps:');
  console.log('  1. Start the dev server: npm run dev');
  console.log('  2. Click "+ New Interview"');
  console.log('  3. Select "Usability Testing"');
  console.log('  4. Test the full workflow\n');
  process.exit(0);
} else {
  console.log(`❌ ${totalTests - passedTests} test(s) failed. Review configuration.\n`);
  process.exit(1);
}

