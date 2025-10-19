/**
 * Agent Router Smoke Test
 * Quick validation of agent routing and execution
 * Run with: npx tsx src/lib/agents/__tests__/agent-router-smoke-test.ts
 */

import { interviewTypeRegistry } from '../../interview-types/registry';
import { BaseInterviewAgent } from '../../interview-types/base/base-agent';
import {
  AgentConfiguration,
  InterviewTypeConfig,
  ResearchBrief,
  GenerateBriefRequest,
  ChatMessage,
} from '../../interview-types/types';
import {
  routeToAgent,
  generateBriefWithAgent,
  generateHumePromptWithAgent,
  hasAgent,
  getAvailableInterviewTypes,
} from '../agent-router';
import {
  executeAgentAction,
  AgentAction,
  executeBatchActions,
} from '../agent-executor';

// ============================================================================
// Mock Agent for Testing
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
// Test Utilities
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
// Test Suite
// ============================================================================

async function runAgentRouterTests() {
  console.log('\n🧪 Running Agent Router Smoke Tests\n');
  console.log('='.repeat(60));

  // Setup - Register a test agent
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
      ],
      requiredFields: [],
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
  interviewTypeRegistry.register(mockAgent, mockConfig);

  // ============================================================================
  // Router Tests
  // ============================================================================

  console.log('\n🔀 Agent Router Tests');
  console.log('-'.repeat(60));

  test('Route to registered agent', () => {
    const agent = routeToAgent('smoke_test');
    assert(agent !== undefined, 'Should return agent');
    assert(agent.getId() === 'smoke_test', 'Should return correct agent');
  });

  test('Throw error for non-existent agent', () => {
    try {
      routeToAgent('non_existent');
      throw new Error('Should have thrown error');
    } catch (error: any) {
      assert(
        error.message.includes('Invalid interview type'),
        'Should throw invalid type error'
      );
    }
  });

  test('Check if agent exists', () => {
    assert(hasAgent('smoke_test') === true, 'Should find registered agent');
    assert(hasAgent('non_existent') === false, 'Should not find unregistered agent');
  });

  test('Get available interview types', () => {
    const types = getAvailableInterviewTypes();
    assert(Array.isArray(types), 'Should return array');
    assert(types.length > 0, 'Should have at least one type');
    assert(
      types.some((t) => t.id === 'smoke_test'),
      'Should include test agent'
    );
  });

  await test('Generate brief with agent', async () => {
    const brief = await generateBriefWithAgent({
      interviewType: 'smoke_test',
      userInput: { projectName: 'Test Project' },
    });
    assert(brief !== undefined, 'Should generate brief');
    assert(brief.objective === 'Test objective', 'Should have correct objective');
  });

  test('Generate Hume prompt with agent', () => {
    const prompt = generateHumePromptWithAgent('smoke_test', {
      objective: 'Test',
      learningGoals: ['Goal 1'],
      keyQuestions: ['Q1'],
      conversationFlow: [],
      generatedAt: new Date(),
      generatedBy: 'test',
    });
    assert(typeof prompt === 'string', 'Should return string');
    assert(prompt.length > 0, 'Should not be empty');
  });

  // ============================================================================
  // Executor Tests
  // ============================================================================

  console.log('\n⚙️  Agent Executor Tests');
  console.log('-'.repeat(60));

  await test('Execute generate brief action', async () => {
    const result = await executeAgentAction(AgentAction.GENERATE_BRIEF, {
      interviewType: 'smoke_test',
      userInput: { projectName: 'Test' },
    });
    assert(result.success === true, 'Should succeed');
    assert(result.data !== undefined, 'Should have data');
    assert(result.data.brief !== undefined, 'Should have brief');
  });

  await test('Execute generate Hume prompt action', async () => {
    const result = await executeAgentAction(AgentAction.GENERATE_HUME_PROMPT, {
      interviewType: 'smoke_test',
      brief: {
        objective: 'Test',
        learningGoals: [],
        keyQuestions: [],
        conversationFlow: [],
        generatedAt: new Date(),
        generatedBy: 'test',
      },
    });
    assert(result.success === true, 'Should succeed');
    assert(result.data !== undefined, 'Should have data');
    assert(result.data.prompt !== undefined, 'Should have prompt');
  });

  await test('Execute batch actions', async () => {
    const results = await executeBatchActions([
      {
        action: AgentAction.GENERATE_BRIEF,
        payload: {
          interviewType: 'smoke_test',
          userInput: { projectName: 'Test' },
        },
      },
      {
        action: AgentAction.GENERATE_HUME_PROMPT,
        payload: {
          interviewType: 'smoke_test',
          brief: {
            objective: 'Test',
            learningGoals: [],
            keyQuestions: [],
            conversationFlow: [],
            generatedAt: new Date(),
            generatedBy: 'test',
          },
        },
      },
    ]);
    assert(results.length === 2, 'Should execute both actions');
    assert(results[0].success === true, 'First action should succeed');
    assert(results[1].success === true, 'Second action should succeed');
  });

  await test('Handle execution errors gracefully', async () => {
    const result = await executeAgentAction(AgentAction.GENERATE_BRIEF, {
      interviewType: 'non_existent',
      userInput: {},
    });
    // The executor successfully executes, but the data contains the error
    assert(result.success === true, 'Executor should complete successfully');
    assert(result.data !== undefined, 'Should have data');
    assert(result.data.success === false, 'Action should fail');
    assert(result.data.error !== undefined, 'Should have error message');
    assert(result.data.error.includes('Invalid interview type'), 'Should have meaningful error');
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
    console.log('\n🎉 All agent router tests passed!');
    console.log('✅ Agent routing and execution working correctly!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed - review errors above\n');
    process.exit(1);
  }
}

// Run tests
runAgentRouterTests().catch((error) => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
