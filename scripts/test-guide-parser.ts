/**
 * Simple test runner for guide-parser
 * Run with: npx tsx scripts/test-guide-parser.ts
 */

import { parseInterviewGuide, validateResearchBrief } from '../src/lib/interview-types/utils/guide-parser';

// Sample Interview Guide
const SAMPLE_INTERVIEW_GUIDE = `
## 1. OBJECTIVE
Understand how users interact with the mobile shopping app to identify pain points in the search and checkout experience.

## 2. LEARNING GOALS
• Identify friction points in product search functionality
• Understand decision-making criteria during product comparison
• Assess checkout flow usability and trust factors
• Detect opportunities for personalization

## 3. KEY QUESTIONS
• How do users currently search for products on mobile?
• What information influences purchase decisions?
• What causes users to abandon their cart?
• How do users compare competing products?
• What would improve the checkout experience?

## 4. CONVERSATION FLOW

"The sample questions guide the conversation but the moderator will follow participant stories and adapt dynamically to achieve the objective."

**Warm-Up & Baseline Habits**

Sample Questions / Areas to Probe:
• "Can you tell me about your typical online shopping experience? What apps do you usually use?"
• Functional Dimensions: frequency of mobile shopping, preferred features
• Emotional Dimensions: comfort with technology, perceived ease of use

**Finding Products (High Emphasis)**

Sample Questions / Areas to Probe:
• "Walk me through how you would search for a new pair of running shoes in this app."
• "What features or filters do you usually look for when searching for products?"
• Functional Dimensions: search functionality, product categories
• Emotional Dimensions: frustration, satisfaction with search results

**Wrap-Up**

Sample Questions / Areas to Probe:
• "Is there anything else you'd like to share about your experience with the app?"
• Functional Dimensions: overall app performance, ease of navigation

## 5. SUCCESS METRICS
• Identify at least 5 specific friction points in search or checkout
• Surface 3-5 pain points or patterns across participants
• Capture 10+ user stories demonstrating current behavior
• Detect signals of feature gaps or competitive threats

## 6. PARTICIPANTS
• Target profile: Regular mobile shoppers (18-45 years old)
• Sample size: 5 participants (formative testing, 85% problem discovery rate)
• Screening criteria: Must have used mobile shopping apps in the past month
• Screening criteria: Mix of iOS and Android users
• Screening criteria: Variety of shopping categories (fashion, electronics, home goods)

## 7. RULES / GUARDRAILS
• Never ask leading questions that suggest desired answers
• Avoid direct asks about sensitive topics like spending habits
• Infer trust and security concerns rather than asking directly
• Test the design, never the user
• Follow user stories naturally without rigid script adherence
`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('🧪 Testing Guide Parser\n');

// Test 1: Parse complete guide
console.log('Test 1: Parse complete interview guide');
const result = parseInterviewGuide(SAMPLE_INTERVIEW_GUIDE);
assert(result !== null, 'Result should not be null');
assert(result.objective !== undefined, 'Should have objective');
console.log('');

// Test 2: Extract objective
console.log('Test 2: Extract objective correctly');
assert(result.objective.includes('mobile shopping app'), 'Objective should mention mobile shopping app');
assert(result.objective.includes('search and checkout'), 'Objective should mention search and checkout');
console.log('  Objective:', result.objective.substring(0, 80) + '...');
console.log('');

// Test 3: Extract learning goals
console.log('Test 3: Extract learning goals');
assert(Array.isArray(result.learningGoals), 'Learning goals should be an array');
assert(result.learningGoals.length > 0, 'Should have at least one learning goal');
assert(result.learningGoals[0].includes('friction points'), 'First goal should mention friction points');
console.log(`  Found ${result.learningGoals.length} learning goals:`);
result.learningGoals.forEach((goal, i) => console.log(`    ${i + 1}. ${goal}`));
console.log('');

// Test 4: Extract key questions
console.log('Test 4: Extract key questions');
assert(Array.isArray(result.keyQuestions), 'Key questions should be an array');
assert(result.keyQuestions.length >= 5, 'Should have at least 5 key questions');
console.log(`  Found ${result.keyQuestions.length} key questions:`);
result.keyQuestions.forEach((q, i) => console.log(`    ${i + 1}. ${q}`));
console.log('');

// Test 5: Extract conversation flow
console.log('Test 5: Extract conversation flow');
assert(Array.isArray(result.conversationFlow), 'Conversation flow should be an array');
assert(result.conversationFlow.length > 0, 'Should have at least one phase');
const warmUpPhase = result.conversationFlow.find(p => p.phase.includes('Warm-Up'));
assert(warmUpPhase !== undefined, 'Should find Warm-Up phase');
console.log(`  Found ${result.conversationFlow.length} conversation phases:`);
result.conversationFlow.forEach((phase, i) => {
  console.log(`    ${i + 1}. ${phase.phase}`);
  console.log(`       Focus: ${phase.focus}`);
  if (phase.keyTopics && phase.keyTopics.length > 0) {
    console.log(`       Topics: ${phase.keyTopics.length} topics`);
  }
});
console.log('');

// Test 6: Extract success metrics
console.log('Test 6: Extract success metrics');
const metrics = result.additionalSections?.successMetrics;
assert(metrics !== undefined, 'Should have success metrics');
assert(Array.isArray(metrics), 'Success metrics should be an array');
assert(metrics.length > 0, 'Should have at least one metric');
console.log(`  Found ${metrics.length} success metrics:`);
metrics.forEach((m: string, i: number) => console.log(`    ${i + 1}. ${m}`));
console.log('');

// Test 7: Extract participants
console.log('Test 7: Extract participants');
const participants = result.additionalSections?.participants;
assert(participants !== undefined, 'Should have participants section');
assert(participants.targetAudience?.includes('mobile shoppers'), 'Should have target audience');
console.log('  Participants:', JSON.stringify(participants, null, 2));
console.log('');

// Test 8: Extract guardrails
console.log('Test 8: Extract guardrails');
const guardrails = result.additionalSections?.guardrails;
assert(guardrails !== undefined, 'Should have guardrails');
assert(Array.isArray(guardrails), 'Guardrails should be an array');
assert(guardrails.length > 0, 'Should have at least one guardrail');
assert(guardrails.some(g => g.includes('leading questions')), 'Should mention leading questions');
console.log(`  Found ${guardrails.length} guardrails:`);
guardrails.forEach((g: string, i: number) => console.log(`    ${i + 1}. ${g}`));
console.log('');

// Test 9: Validate parsed brief
console.log('Test 9: Validate parsed brief');
const validation = validateResearchBrief(result);
assert(validation.valid === true, 'Parsed brief should be valid');
assert(validation.errors.length === 0, 'Should have no errors');
console.log('  Validation result:', validation.valid ? '✅ Valid' : '❌ Invalid');
if (validation.warnings.length > 0) {
  console.log('  Warnings:');
  validation.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
}
console.log('');

// Test 10: Error handling - empty guide
console.log('Test 10: Error handling - empty guide');
try {
  parseInterviewGuide('');
  console.error('❌ FAILED: Should throw error for empty guide');
  process.exit(1);
} catch (error) {
  assert((error as Error).message.includes('empty or invalid'), 'Should throw appropriate error');
}
console.log('');

// Test 11: Error handling - missing objective
console.log('Test 11: Error handling - missing objective');
const invalidGuide = `
## 2. LEARNING GOALS
• Goal 1
`;
try {
  parseInterviewGuide(invalidGuide);
  console.error('❌ FAILED: Should throw error for missing objective');
  process.exit(1);
} catch (error) {
  assert((error as Error).message.includes('OBJECTIVE section is required'), 'Should throw appropriate error');
}
console.log('');

console.log('═══════════════════════════════════════');
console.log('🎉 All tests passed!');
console.log('═══════════════════════════════════════');
console.log('');
console.log('Parser Stats:');
console.log(`  • Objective: ✅`);
console.log(`  • Learning Goals: ${result.learningGoals.length} extracted`);
console.log(`  • Key Questions: ${result.keyQuestions.length} extracted`);
console.log(`  • Conversation Phases: ${result.conversationFlow.length} extracted`);
console.log(`  • Success Metrics: ${metrics.length} extracted`);
console.log(`  • Guardrails: ${guardrails.length} extracted`);
console.log('');

