/**
 * Hume Prompt Generator Test
 * Run with: npx tsx src/lib/hume/__tests__/prompt-generator-test.ts
 */

import { generateHumePrompt, validatePrompt } from '../prompt-generator';
import type { ResearchBrief } from '../../interview-types/types';

// Test utilities
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error: any) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    failedTests++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sample research brief
const sampleBrief: ResearchBrief = {
  objective: 'Understand user pain points and identify opportunities for product improvement',
  learningGoals: [
    'Identify main frustrations with current product',
    'Discover most requested features',
    'Understand user workflow and context',
    'Assess competitive alternatives',
  ],
  keyQuestions: [
    'What frustrates you most when using the product?',
    'If you could change one thing, what would it be?',
    'How does this compare to other tools you\'ve tried?',
    'What would make this 10x better for you?',
  ],
  conversationFlow: [
    {
      phase: 'Warm-up',
      focus: 'Build rapport and understand context',
      keyTopics: ['role', 'usage frequency'],
    },
    {
      phase: 'Current Experience',
      focus: 'Understand how they use the product today',
      keyTopics: ['workflow', 'pain points'],
    },
    {
      phase: 'Deep Dive',
      focus: 'Explore specific frustrations and desires',
      keyTopics: ['main problems', 'feature requests'],
    },
    {
      phase: 'Comparative',
      focus: 'Understand competitive landscape',
      keyTopics: ['alternatives', 'switching factors'],
    },
  ],
  generatedAt: new Date(),
  generatedBy: 'test-agent',
};

async function runTests() {
  console.log('\n🧪 Testing Hume Prompt Generator\n');
  console.log('='.repeat(60));

  // ============================================================================
  // Basic Generation Tests
  // ============================================================================

  console.log('\n📝 Basic Generation Tests');
  console.log('-'.repeat(60));

  test('Generate prompt for product feedback', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback', {
      userName: 'Sarah',
      productName: 'MyApp',
    });

    assert(typeof prompt === 'string', 'Should return a string');
    assert(prompt.length > 0, 'Should not be empty');
    assert(prompt.includes('Sarah'), 'Should include user name');
    assert(prompt.includes('MyApp'), 'Should include product name');
  });

  test('Generate prompt for NPS interview', () => {
    const prompt = generateHumePrompt(sampleBrief, 'nps', {
      userName: 'John',
    });

    assert(typeof prompt === 'string', 'Should return a string');
    assert(prompt.includes('John'), 'Should include user name');
    assert(prompt.includes('satisfaction'), 'Should reference satisfaction for NPS');
  });

  test('Generate prompt for custom interview', () => {
    const prompt = generateHumePrompt(sampleBrief, 'custom');

    assert(typeof prompt === 'string', 'Should return a string');
    assert(prompt.includes('research interviewer'), 'Should use custom role');
  });

  // ============================================================================
  // Prompt Structure Tests
  // ============================================================================

  console.log('\n🏗️  Prompt Structure Tests');
  console.log('-'.repeat(60));

  test('Contains required sections', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    const requiredSections = [
      '<role>',
      '<voice_communication_style>',
      '<personalization>',
      '<core_philosophy>',
      '<conversation_topics_to_cover>',
      '<opening>',
      '<conversation_flow>',
      '<emotional_response_guidelines>',
      '<follow_up_techniques>',
      '<what_to_avoid>',
      '<enter_conversation_mode>',
    ];

    requiredSections.forEach((section) => {
      assert(
        prompt.includes(section),
        `Should include ${section} section`
      );
    });
  });

  test('Includes research brief objective', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    assert(
      prompt.includes(sampleBrief.objective),
      'Should include research objective'
    );
  });

  test('Includes all learning goals', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    sampleBrief.learningGoals.forEach((goal) => {
      assert(
        prompt.includes(goal),
        `Should include learning goal: ${goal}`
      );
    });
  });

  test('Includes all key questions', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    sampleBrief.keyQuestions.forEach((question) => {
      assert(
        prompt.includes(question),
        `Should include key question: ${question}`
      );
    });
  });

  test('Includes conversation flow phases', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    sampleBrief.conversationFlow.forEach((phase) => {
      assert(
        prompt.includes(phase.phase),
        `Should include phase: ${phase.phase}`
      );
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  console.log('\n✓ Validation Tests');
  console.log('-'.repeat(60));

  test('Validate good prompt', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');
    const validation = validatePrompt(prompt);

    assert(validation.valid === true, 'Should validate as valid');
    assert(validation.stats.length > 0, 'Should calculate length');
    assert(validation.stats.sectionCount > 0, 'Should count sections');
  });

  test('Detect missing sections', () => {
    const badPrompt = 'This is a bad prompt without proper structure';
    const validation = validatePrompt(badPrompt);

    assert(validation.valid === false, 'Should detect invalid prompt');
    assert(validation.warnings.length > 0, 'Should have warnings');
  });

  test('Warn about short prompts', () => {
    const shortPrompt = '<role>Test</role>';
    const validation = validatePrompt(shortPrompt);

    assert(
      validation.warnings.some((w) => w.includes('too short')),
      'Should warn about short prompt'
    );
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  console.log('\n🔧 Edge Case Tests');
  console.log('-'.repeat(60));

  test('Handle missing user name', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    assert(prompt.includes('there'), 'Should use default name "there"');
  });

  test('Handle missing product name', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    assert(
      prompt.includes('the product'),
      'Should use default "the product"'
    );
  });

  test('Handle empty conversation flow', () => {
    const briefWithoutFlow = { ...sampleBrief, conversationFlow: [] };
    const prompt = generateHumePrompt(briefWithoutFlow, 'product_feedback');

    assert(typeof prompt === 'string', 'Should still generate prompt');
    assert(prompt.includes('<conversation_flow>'), 'Should include flow section');
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  console.log('\n🔗 Integration Tests');
  console.log('-'.repeat(60));

  test('Prompt follows pure-evi.ts structure', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    // Should follow same structure as pure-evi.ts
    assert(prompt.includes('<role>'), 'Uses same <role> tag');
    assert(
      prompt.includes('<voice_communication_style>'),
      'Uses same style tag'
    );
    assert(prompt.includes('<personalization>'), 'Uses same personalization tag');
  });

  test('Natural language conversation style', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    // Should emphasize natural conversation
    assert(
      prompt.includes('natural'),
      'Should emphasize natural speech'
    );
    assert(
      prompt.includes('empathetic'),
      'Should emphasize empathy'
    );
  });

  // ============================================================================
  // Output Quality Tests
  // ============================================================================

  console.log('\n🌟 Output Quality Tests');
  console.log('-'.repeat(60));

  test('Prompt length is reasonable', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    assert(
      prompt.length >= 500 && prompt.length <= 8000,
      `Prompt length (${prompt.length}) should be between 500-8000 chars`
    );
  });

  test('Has expected number of sections', () => {
    const prompt = generateHumePrompt(sampleBrief, 'product_feedback');

    const sections = prompt.match(/<\w+>/g) || [];
    const expectedSections = [
      '<role>',
      '<voice_communication_style>',
      '<personalization>',
      '<core_philosophy>',
      '<conversation_topics_to_cover>',
      '<opening>',
      '<conversation_flow>',
      '<emotional_response_guidelines>',
      '<follow_up_techniques>',
      '<what_to_avoid>',
      '<enter_conversation_mode>',
    ];

    assert(
      sections.length >= expectedSections.length,
      `Should have at least ${expectedSections.length} sections, got ${sections.length}`
    );
  });

  // ============================================================================
  // Display Sample Output
  // ============================================================================

  console.log('\n📄 Sample Generated Prompt (truncated):');
  console.log('-'.repeat(60));

  const samplePrompt = generateHumePrompt(sampleBrief, 'product_feedback', {
    userName: 'Sarah',
    productName: 'MyApp',
  });

  const preview = samplePrompt.substring(0, 500) + '...';
  console.log(preview);

  const validation = validatePrompt(samplePrompt);
  console.log('\nPrompt Stats:');
  console.log(`  Length: ${validation.stats.length} characters`);
  console.log(`  Sections: ${validation.stats.sectionCount}`);
  console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`);
  if (validation.warnings.length > 0) {
    console.log(`  Warnings: ${validation.warnings.join(', ')}`);
  }

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total: ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 All Hume prompt generator tests passed!');
    console.log('✅ Prompt generation working correctly!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed - review errors above\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
