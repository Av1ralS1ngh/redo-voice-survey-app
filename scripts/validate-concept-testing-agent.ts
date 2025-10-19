/**
 * Validation Script for Concept Testing Agent
 * Run with: npx tsx scripts/validate-concept-testing-agent.ts
 */

import { getAgentByType, getConfigByType } from '../src/lib/interview-types/registry';

console.log('🧪 Validating Concept Testing Agent Implementation\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

// Test 1: Agent Registration
console.log('\n✅ Test 1: Agent Registration');
try {
  const agent = getAgentByType('concept_testing');  // Changed to match UI category
  if (agent) {
    console.log(`   ✓ Agent found: ${agent.getName()}`);
    console.log(`   ✓ Agent ID: ${agent.getId()}`);
    console.log(`   ✓ Agent Description: ${agent.getConfig().description.substring(0, 80)}...`);
    passed++;
  } else {
    console.log('   ✗ Agent not found in registry');
    failed++;
  }
} catch (error) {
  console.log(`   ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  failed++;
}

// Test 2: Configuration
console.log('\n✅ Test 2: Configuration');
try {
  const config = getConfigByType('concept_testing');  // Changed to match UI category
  if (config) {
    console.log(`   ✓ Config found`);
    console.log(`   ✓ Category: ${config.category}`);
    console.log(`   ✓ Display Name: ${config.displayName}`);
    console.log(`   ✓ Default Duration: ${config.defaultDuration} minutes`);
    console.log(`   ✓ Estimated Participants: ${config.estimatedParticipants}`);
    console.log(`   ✓ Tags: ${config.tags?.join(', ')}`);
    passed++;
  } else {
    console.log('   ✗ Configuration not found in registry');
    failed++;
  }
} catch (error) {
  console.log(`   ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  failed++;
}

// Test 3: Agent Capabilities
console.log('\n✅ Test 3: Agent Capabilities');
try {
  const agent = getAgentByType('concept_testing');  // Changed to match UI category
  if (agent) {
    const config = agent.getConfig();
    console.log(`   ✓ Generate Brief: ${config.capabilities.generateBrief ? 'Yes' : 'No'}`);
    console.log(`   ✓ Refine Brief: ${config.capabilities.refineBrief ? 'Yes' : 'No'}`);
    console.log(`   ✓ Generate Questions: ${config.capabilities.generateQuestions ? 'Yes' : 'No'}`);
    console.log(`   ✓ Generate Hume Prompt: ${config.capabilities.generateHumePrompt ? 'Yes' : 'No'}`);
    passed++;
  } else {
    console.log('   ✗ Agent not found');
    failed++;
  }
} catch (error) {
  console.log(`   ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  failed++;
}

// Test 4: System Prompt
console.log('\n✅ Test 4: System Prompt');
try {
  const agent = getAgentByType('concept_testing');  // Changed to match UI category
  if (agent) {
    const systemPrompt = agent.getConfig().systemPrompt;
    
    // Check for key sections
    const hasEdgeCaseHandling = systemPrompt.includes('EDGE CASE HANDLING');
    const hasContextAware = systemPrompt.includes('CONTEXT-AWARE CONCEPT GENERATION');
    const hasPostGeneration = systemPrompt.includes('POST-GENERATION SUPPORT');
    const hasBriefStructure = systemPrompt.includes('BRIEF STRUCTURE');
    
    console.log(`   ✓ System Prompt Length: ${systemPrompt.length} characters`);
    console.log(`   ${hasEdgeCaseHandling ? '✓' : '✗'} Edge Case Handling: ${hasEdgeCaseHandling ? 'Present' : 'Missing'}`);
    console.log(`   ${hasContextAware ? '✓' : '✗'} Context-Aware Generation: ${hasContextAware ? 'Present' : 'Missing'}`);
    console.log(`   ${hasPostGeneration ? '✓' : '✗'} Post-Generation Support: ${hasPostGeneration ? 'Present' : 'Missing'}`);
    console.log(`   ${hasBriefStructure ? '✓' : '✗'} Brief Structure (7 sections): ${hasBriefStructure ? 'Present' : 'Missing'}`);
    
    if (hasEdgeCaseHandling && hasContextAware && hasPostGeneration && hasBriefStructure) {
      passed++;
    } else {
      console.log('   ⚠️  Some sections are missing from the system prompt');
      failed++;
    }
  } else {
    console.log('   ✗ Agent not found');
    failed++;
  }
} catch (error) {
  console.log(`   ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  failed++;
}

// Test 5: Supported Interview Types
console.log('\n✅ Test 5: Supported Interview Types');
try {
  const config = getConfigByType('concept_testing');  // Changed to match UI category
  if (config && config.agent.supportedInterviewTypes) {
    console.log(`   ✓ Supported Types: ${config.agent.supportedInterviewTypes.join(', ')}`);
    if (config.agent.supportedInterviewTypes.includes('concept_testing')) {
      console.log(`   ✓ Correctly supports 'concept_testing' type`);
      passed++;
    } else {
      console.log(`   ✗ Does not support 'concept_testing' type`);
      failed++;
    }
  } else {
    console.log('   ⚠️  No supported interview types defined');
    failed++;
  }
} catch (error) {
  console.log(`   ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  failed++;
}

// Test 6: Examples
console.log('\n✅ Test 6: Example Prompts');
try {
  const config = getConfigByType('concept_testing');  // Changed to match UI category
  if (config && config.examples && config.examples.length > 0) {
    console.log(`   ✓ Example Count: ${config.examples.length}`);
    config.examples.forEach((example, idx) => {
      console.log(`   ${idx + 1}. "${example}"`);
    });
    passed++;
  } else {
    console.log('   ⚠️  No examples defined');
    failed++;
  }
} catch (error) {
  console.log(`   ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  failed++;
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📊 Validation Summary:');
console.log(`   ✅ Passed: ${passed}/6`);
console.log(`   ❌ Failed: ${failed}/6`);

if (failed === 0) {
  console.log('\n✨ All tests passed! Concept Testing Agent is properly configured.');
  console.log('\n🚀 Next steps:');
  console.log('   1. Run database migration: See CONCEPT_TESTING_AGENT_IMPLEMENTATION.md');
  console.log('   2. Start dev server: npm run dev');
  console.log('   3. Create a Concept Testing interview from the UI');
  console.log('   4. Test with example prompts');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the errors above.');
  console.log('\n🔍 Troubleshooting:');
  console.log('   - Check that all files were created correctly');
  console.log('   - Verify agent is imported and registered in registry.ts');
  console.log('   - Ensure no TypeScript compilation errors');
  process.exit(1);
}

