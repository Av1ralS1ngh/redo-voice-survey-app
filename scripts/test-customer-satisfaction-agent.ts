/**
 * Validation Script for Customer Satisfaction Agent
 * Tests the agent configuration and integration without requiring Jest
 */

import { 
  CustomerSatisfactionAgent, 
  customerSatisfactionAgentConfig, 
  customerSatisfactionConfig 
} from '../src/lib/interview-types/agents/customer-satisfaction-agent';
import { interviewTypeRegistry } from '../src/lib/interview-types/registry';
import { BaseInterviewAgent } from '../src/lib/interview-types/base/base-agent';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description: string, testFn: () => void | Promise<void>) {
  totalTests++;
  try {
    testFn();
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    console.log(`  ${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
    failedTests++;
  }
}

function expect(value: any) {
  return {
    toBeDefined: () => {
      if (value === undefined || value === null) {
        throw new Error(`Expected value to be defined, got ${value}`);
      }
    },
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toContain: (substring: string) => {
      if (typeof value !== 'string') {
        throw new Error(`Expected string, got ${typeof value}`);
      }
      if (!value.includes(substring)) {
        throw new Error(`Expected string to contain "${substring}"`);
      }
    },
    toBeGreaterThan: (num: number) => {
      if (value <= num) {
        throw new Error(`Expected ${value} to be greater than ${num}`);
      }
    },
    toHaveLength: (length: number) => {
      if (!value || !value.length) {
        throw new Error(`Expected value to have length property`);
      }
      if (value.length !== length) {
        throw new Error(`Expected length ${value.length} to be ${length}`);
      }
    },
    toBeInstanceOf: (constructor: any) => {
      if (!(value instanceof constructor)) {
        throw new Error(`Expected value to be instance of ${constructor.name}`);
      }
    },
  };
}

console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════`);
console.log(`Customer Satisfaction Agent - Validation Tests`);
console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

// ============================================================================
// Test Suite 1: Basic Agent Structure
// ============================================================================

console.log(`${colors.blue}▶ Basic Agent Structure${colors.reset}`);

const agent = new CustomerSatisfactionAgent(customerSatisfactionAgentConfig);

test('Agent instance created', () => {
  expect(agent).toBeDefined();
  expect(agent).toBeInstanceOf(BaseInterviewAgent);
  expect(agent).toBeInstanceOf(CustomerSatisfactionAgent);
});

test('Agent has correct ID', () => {
  expect(agent.getId()).toBe('customer_satisfaction');
});

test('Agent has correct name', () => {
  expect(agent.getName()).toBe('Customer Satisfaction');
});

test('Agent has system prompt', () => {
  const prompt = agent.getSystemPrompt();
  expect(prompt).toBeDefined();
  expect(prompt.length).toBeGreaterThan(1000);
});

// ============================================================================
// Test Suite 2: System Prompt Content
// ============================================================================

console.log(`\n${colors.blue}▶ System Prompt Content Validation${colors.reset}`);

const systemPrompt = agent.getSystemPrompt();

test('Includes function calling instructions', () => {
  expect(systemPrompt).toContain('CRITICAL FUNCTION CALLING INSTRUCTION');
  expect(systemPrompt).toContain('generate_research_brief');
});

test('Includes core principles', () => {
  expect(systemPrompt).toContain('CORE PRINCIPLE: GENERATE FAST WITH INTELLIGENCE');
  expect(systemPrompt).toContain('DOMAIN INTELLIGENCE');
});

test('Includes core dimensions', () => {
  expect(systemPrompt).toContain('CORE DIMENSIONS');
  expect(systemPrompt).toContain('Quality/Performance');
  expect(systemPrompt).toContain('Ease of Use');
  expect(systemPrompt).toContain('Value for Money');
  expect(systemPrompt).toContain('Support/Service');
  expect(systemPrompt).toContain('Brand Trust & Loyalty');
});

test('Includes product-specific dimensions', () => {
  expect(systemPrompt).toContain('PRODUCT-SPECIFIC ADDITIONS');
  expect(systemPrompt).toContain('SaaS');
  expect(systemPrompt).toContain('Subscriptions');
  expect(systemPrompt).toContain('Services');
});

test('Includes dimension selection rule (Priority 1)', () => {
  expect(systemPrompt).toContain('DIMENSION SELECTION RULE');
  expect(systemPrompt).toContain('How to Choose 4-6 Dimensions');
  expect(systemPrompt).toContain('STEP 1: Start with Core Dimensions');
  expect(systemPrompt).toContain('STEP 4: Fit to Time Budget');
});

test('Includes time budget rule (Priority 1)', () => {
  expect(systemPrompt).toContain('TIME BUDGET RULE');
  expect(systemPrompt).toContain('45-min interviews → Maximum 4-5 dimensions');
  expect(systemPrompt).toContain('60-min interviews → Maximum 5-6 dimensions');
});

test('Includes participant segmentation', () => {
  expect(systemPrompt).toContain('PARTICIPANT SEGMENTATION');
  expect(systemPrompt).toContain('Promoters');
  expect(systemPrompt).toContain('Passives');
  expect(systemPrompt).toContain('Detractors');
  expect(systemPrompt).toContain('NPS 9-10');
});

test('Includes question type framework', () => {
  expect(systemPrompt).toContain('[Factual]');
  expect(systemPrompt).toContain('[Experiential]');
  expect(systemPrompt).toContain('[Emotional]');
  expect(systemPrompt).toContain('[Behavioral]');
});

test('Includes 6-section brief structure', () => {
  expect(systemPrompt).toContain('BRIEF STRUCTURE - 6 Sections');
  expect(systemPrompt).toContain('Project Overview & Objectives');
  expect(systemPrompt).toContain('Research Design & Participants');
  expect(systemPrompt).toContain('Interview Framework');
  expect(systemPrompt).toContain('Success Metrics & Analysis');
  expect(systemPrompt).toContain('Timeline & Logistics');
  expect(systemPrompt).toContain('Deliverables');
});

test('Includes meal kit example', () => {
  expect(systemPrompt).toContain('meal kit');
  expect(systemPrompt).toContain('cancellations after 2-3 months');
  expect(systemPrompt).toContain('Food Quality');
});

// ============================================================================
// Test Suite 3: Brief Template
// ============================================================================

console.log(`\n${colors.blue}▶ Brief Template Configuration${colors.reset}`);

const template = agent.getBriefTemplate();

test('Template has 6 sections', () => {
  expect(template.sections).toBeDefined();
  expect(template.sections).toHaveLength(6);
});

test('Template uses markdown format', () => {
  expect(template.format).toBe('markdown');
});

test('All sections are required', () => {
  const allRequired = template.sections.every(s => s.required === true);
  if (!allRequired) {
    throw new Error('Not all sections are marked as required');
  }
});

test('Has interview framework section', () => {
  const frameworkSection = template.sections.find(s => s.id === 'interview_framework');
  expect(frameworkSection).toBeDefined();
  expect(frameworkSection?.contentType).toBe('framework');
});

// ============================================================================
// Test Suite 4: Conversation Flow
// ============================================================================

console.log(`\n${colors.blue}▶ Conversation Flow Configuration${colors.reset}`);

const config = agent.getConfig();

test('Has conversational-curious opening', () => {
  expect(config.conversationFlow.openingStyle).toBe('conversational-curious');
});

test('Uses open-ended exploratory questions', () => {
  expect(config.conversationFlow.questionStyle).toBe('open-ended-exploratory');
});

test('Deep-dives on pain points', () => {
  expect(config.conversationFlow.followUpStrategy).toBe('deep-dive-on-pain-points');
});

test('Has action-oriented closing', () => {
  expect(config.conversationFlow.closingStyle).toBe('action-oriented');
});

test('Has structured conversation phases', () => {
  expect(config.conversationFlow.structure).toBeDefined();
  if (!config.conversationFlow.structure || config.conversationFlow.structure.length === 0) {
    throw new Error('No conversation structure defined');
  }
});

// ============================================================================
// Test Suite 5: Registry Integration
// ============================================================================

console.log(`\n${colors.blue}▶ Registry Integration${colors.reset}`);

test('Agent is registered in registry', () => {
  const hasType = interviewTypeRegistry.hasType('customer_satisfaction');
  if (!hasType) {
    throw new Error('Agent not found in registry');
  }
});

test('Agent can be retrieved from registry', () => {
  const retrievedAgent = interviewTypeRegistry.getAgent('customer_satisfaction');
  expect(retrievedAgent).toBeDefined();
  expect(retrievedAgent?.getId()).toBe('customer_satisfaction');
});

test('Config is in registry', () => {
  const config = interviewTypeRegistry.getConfig('customer_satisfaction');
  expect(config).toBeDefined();
  expect(config?.agent.id).toBe('customer_satisfaction');
});

test('Agent validates successfully', () => {
  const validation = interviewTypeRegistry.validateType('customer_satisfaction');
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
});

test('Agent is in active types list', () => {
  const activeTypes = interviewTypeRegistry.getActiveTypes();
  const satisfactionType = activeTypes.find(t => t.id === 'customer_satisfaction');
  expect(satisfactionType).toBeDefined();
  expect(satisfactionType?.name).toBe('Customer Satisfaction');
});

// ============================================================================
// Test Suite 6: Interview Type Config
// ============================================================================

console.log(`\n${colors.blue}▶ Interview Type Configuration${colors.reset}`);

test('Has workflow steps', () => {
  const steps = customerSatisfactionConfig.workflow.steps;
  expect(steps).toBeDefined();
  if (steps.length === 0) {
    throw new Error('No workflow steps defined');
  }
});

test('Has required fields', () => {
  const requiredFields = customerSatisfactionConfig.workflow.requiredFields;
  const projectNameField = requiredFields.find(f => f.fieldName === 'projectName');
  const briefField = requiredFields.find(f => f.fieldName === 'researchBrief');
  
  expect(projectNameField).toBeDefined();
  expect(briefField).toBeDefined();
});

test('Has UI features configured', () => {
  const features = customerSatisfactionConfig.ui.features;
  expect(features.showChatInterface).toBe(true);
  expect(features.showBriefPreview).toBe(true);
  expect(features.allowSectionEditing).toBe(true);
});

test('Has metadata configured', () => {
  const metadata = customerSatisfactionConfig.metadata;
  expect(metadata.isActive).toBe(true);
  expect(metadata.version).toBe('1.0');
  expect(metadata.category).toBe('measurement');
});

test('Has appropriate tags', () => {
  const tags = customerSatisfactionConfig.metadata.tags;
  if (!tags || !Array.isArray(tags)) {
    throw new Error('Tags not configured');
  }
  if (!tags.includes('customer satisfaction')) {
    throw new Error('Missing "customer satisfaction" tag');
  }
  if (!tags.includes('retention')) {
    throw new Error('Missing "retention" tag');
  }
});

test('Has estimated metrics', () => {
  const metadata = customerSatisfactionConfig.metadata;
  expect(metadata.avgBriefLength).toBe(4500);
  expect(metadata.avgGenerationTime).toBe(25);
});

// ============================================================================
// Test Suite 7: Quality Validations
// ============================================================================

console.log(`\n${colors.blue}▶ Quality Validations${colors.reset}`);

test('Enforces 4-6 dimension guideline', () => {
  expect(systemPrompt).toContain('4-6 dimensions');
  expect(systemPrompt).toContain('Select 4-6');
});

test('Emphasizes satisfaction segmentation', () => {
  expect(systemPrompt).toContain('ALWAYS segment by satisfaction level');
});

test('Provides framework over scripts', () => {
  expect(systemPrompt).toContain('Interview framework over scripts');
  expect(systemPrompt).toContain('example questions');
});

test('Grounds briefs in user context', () => {
  expect(systemPrompt).toContain('GROUND BRIEF IN USER\'S ACTUAL SITUATION');
});

// ============================================================================
// Results Summary
// ============================================================================

console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════`);
console.log(`Test Results Summary`);
console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

console.log(`Total Tests:  ${totalTests}`);
console.log(`${colors.green}✓ Passed:     ${passedTests}${colors.reset}`);

if (failedTests > 0) {
  console.log(`${colors.red}✗ Failed:     ${failedTests}${colors.reset}`);
  console.log(`\n${colors.red}❌ Some tests failed!${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.red}✗ Failed:     0${colors.reset}`);
  console.log(`\n${colors.green}✅ All tests passed!${colors.reset}\n`);
  console.log(`${colors.cyan}The Customer Satisfaction Agent is ready for use.${colors.reset}\n`);
  process.exit(0);
}

