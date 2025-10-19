/**
 * Simple Smoke Test Runner
 * Run with: npx tsx src/lib/interview-types/__tests__/smoke-test.ts
 */

import { interviewTypeRegistry } from '../registry';
import { BaseInterviewAgent } from '../base/base-agent';
import { BaseWorkflow } from '../base/base-workflow';
import {
  AgentConfiguration,
  InterviewTypeConfig,
  ResearchBrief,
  GenerateBriefRequest,
  ChatMessage,
  WorkflowConfiguration,
} from '../types';

// ============================================================================
// Test Runner Utilities
// ============================================================================

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          console.log(`✅ ${name}`);
          passedTests++;
        })
        .catch((error) => {
          console.error(`❌ ${name}`);
          console.error(`   Error: ${error.message}`);
          failedTests++;
        });
    } else {
      console.log(`✅ ${name}`);
      passedTests++;
    }
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

// ============================================================================
// Mock Agent Implementation
// ============================================================================

class MockTestAgent extends BaseInterviewAgent {
  async generateBrief(request: GenerateBriefRequest): Promise<ResearchBrief> {
    return {
      objective: 'Test objective',
      learningGoals: ['Goal 1', 'Goal 2'],
      keyQuestions: ['Question 1', 'Question 2'],
      conversationFlow: [],
      generatedAt: new Date(),
      generatedBy: 'test-agent',
    };
  }

  async refineBrief(
    currentBrief: ResearchBrief,
    userFeedback: string,
    conversationHistory: ChatMessage[]
  ): Promise<ResearchBrief> {
    return currentBrief;
  }

  generateHumePrompt(brief: ResearchBrief): string {
    return 'Test Hume prompt';
  }
}

// ============================================================================
// Test Suite
// ============================================================================

async function runSmokeTests() {
  console.log('\n🧪 Running Smoke Tests for Interview Type Registry\n');
  console.log('='.repeat(60));

  // Setup
  const mockAgentConfig: AgentConfiguration = {
    id: 'smoke_test',
    name: 'Smoke Test Agent',
    description: 'Agent for smoke testing',
    systemPrompt: 'You are a test agent',
    briefTemplate: {
      sections: [
        {
          id: 'objective',
          title: 'Objective',
          required: true,
          contentType: 'text',
        },
      ],
    },
    conversationFlow: {
      openingStyle: 'conversational',
      questionStyle: 'open-ended',
      followUpStrategy: 'adaptive',
      closingStyle: 'summary',
    },
  };

  const mockConfig: InterviewTypeConfig = {
    agent: mockAgentConfig,
    workflow: {
      steps: [
        {
          id: 'step1',
          title: 'Step 1',
          component: 'TestStep',
          required: true,
          order: 1,
        },
        {
          id: 'step2',
          title: 'Step 2',
          component: 'TestStep2',
          required: true,
          order: 2,
        },
      ],
      requiredFields: [
        {
          name: 'projectName',
          type: 'text',
        },
      ],
    },
    ui: {
      features: {
        enableUrlInput: false,
        enableQuestionPaste: true,
      },
    },
    metadata: {
      version: '1.0.0',
      isActive: true,
    },
  };

  const mockAgent = new MockTestAgent(mockAgentConfig);

  // ============================================================================
  // Base Agent Tests
  // ============================================================================

  console.log('\n📦 Base Agent Tests');
  console.log('-'.repeat(60));

  test('Create base agent instance', () => {
    assert(mockAgent !== undefined, 'Agent should be defined');
    assert(mockAgent instanceof BaseInterviewAgent, 'Should be BaseInterviewAgent instance');
  });

  test('Get agent ID', () => {
    assert(mockAgent.getId() === 'smoke_test', 'Should return correct ID');
  });

  test('Get agent name', () => {
    assert(mockAgent.getName() === 'Smoke Test Agent', 'Should return correct name');
  });

  test('Get system prompt', () => {
    const prompt = mockAgent.getSystemPrompt();
    assert(prompt === 'You are a test agent', 'Should return correct prompt');
  });

  await test('Generate research brief', async () => {
    const request: GenerateBriefRequest = {
      interviewType: 'smoke_test',
      userInput: { projectName: 'Test' },
    };
    const brief = await mockAgent.generateBrief(request);
    assert(brief !== undefined, 'Brief should be defined');
    assert(brief.objective === 'Test objective', 'Should have correct objective');
    assert(brief.learningGoals.length === 2, 'Should have 2 learning goals');
  });

  test('Generate Hume prompt', () => {
    const brief: ResearchBrief = {
      objective: 'Test',
      learningGoals: [],
      keyQuestions: [],
      conversationFlow: [],
      generatedAt: new Date(),
      generatedBy: 'test',
    };
    const prompt = mockAgent.generateHumePrompt(brief);
    assert(prompt.length > 0, 'Prompt should not be empty');
  });

  test('Generate welcome message', () => {
    const message = mockAgent.generateWelcomeMessage();
    assert(message.role === 'assistant', 'Should be assistant role');
    assert(message.content.includes('Smoke Test Agent'), 'Should mention agent name');
  });

  test('Validate input', () => {
    const valid = mockAgent.validateInput({ projectName: 'Test' });
    assert(valid.valid === true, 'Should validate correct input');

    const invalid = mockAgent.validateInput({ projectName: '' });
    assert(invalid.valid === false, 'Should reject empty project name');
  });

  // ============================================================================
  // Registry Tests
  // ============================================================================

  console.log('\n📚 Registry Tests');
  console.log('-'.repeat(60));

  test('Register agent', () => {
    interviewTypeRegistry.register(mockAgent, mockConfig);
    assert(interviewTypeRegistry.hasType('smoke_test'), 'Should register agent');
  });

  test('Get registered agent', () => {
    const agent = interviewTypeRegistry.getAgent('smoke_test');
    assert(agent !== undefined, 'Should retrieve agent');
    assert(agent?.getId() === 'smoke_test', 'Should be correct agent');
  });

  test('Get configuration', () => {
    const config = interviewTypeRegistry.getConfig('smoke_test');
    assert(config !== undefined, 'Should retrieve config');
    assert(config?.agent.id === 'smoke_test', 'Should be correct config');
  });

  test('Get workflow steps', () => {
    const steps = interviewTypeRegistry.getWorkflowSteps('smoke_test');
    assert(steps.length === 2, 'Should have 2 steps');
    assert(steps[0] === 'step1', 'First step should be step1');
  });

  test('Get UI features', () => {
    const features = interviewTypeRegistry.getUIFeatures('smoke_test');
    assert(features.enableUrlInput === false, 'URL input should be disabled');
    assert(features.enableQuestionPaste === true, 'Question paste should be enabled');
  });

  test('Validate type', () => {
    const validation = interviewTypeRegistry.validateType('smoke_test');
    assert(validation.valid === true, 'Should validate correctly');
    assert(validation.errors.length === 0, 'Should have no errors');
  });

  // ============================================================================
  // Workflow Tests
  // ============================================================================

  console.log('\n🔄 Workflow Tests');
  console.log('-'.repeat(60));

  const workflowConfig: WorkflowConfiguration = {
    steps: mockConfig.workflow.steps,
    requiredFields: mockConfig.workflow.requiredFields,
  };

  const workflow = new BaseWorkflow(workflowConfig);

  test('Create workflow instance', () => {
    assert(workflow !== undefined, 'Workflow should be defined');
    assert(workflow instanceof BaseWorkflow, 'Should be BaseWorkflow instance');
  });

  test('Get workflow steps', () => {
    const steps = workflow.getSteps();
    assert(steps.length === 2, 'Should have 2 steps');
  });

  test('Get specific step', () => {
    const step = workflow.getStep('step1');
    assert(step !== undefined, 'Step should exist');
    assert(step?.title === 'Step 1', 'Should have correct title');
  });

  test('Navigate to next step', () => {
    const nextStep = workflow.getNextStep('step1');
    assert(nextStep !== null, 'Should have next step');
    assert(nextStep?.id === 'step2', 'Next step should be step2');
  });

  test('Mark step complete', () => {
    const state = mockAgent.createInitialState('test-id');
    const newState = workflow.completeStep('step1', state);
    assert(newState.completedSteps.includes('step1'), 'Step should be marked complete');
  });

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
    console.log('\n🎉 All smoke tests passed!');
    console.log('✅ Foundation is solid - ready to continue building!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed - review errors above\n');
    process.exit(1);
  }
}

// Run tests
runSmokeTests().catch((error) => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
