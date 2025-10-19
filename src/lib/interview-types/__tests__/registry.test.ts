/**
 * Quick Smoke Tests for Interview Type Registry
 * These tests validate the basic functionality of the registry system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { interviewTypeRegistry } from '../registry';
import { BaseInterviewAgent } from '../base/base-agent';
import {
  AgentConfiguration,
  InterviewTypeConfig,
  ResearchBrief,
  GenerateBriefRequest,
  ChatMessage,
} from '../types';

// ============================================================================
// Mock Agent for Testing
// ============================================================================

class MockTestAgent extends BaseInterviewAgent {
  constructor(config: AgentConfiguration) {
    super(config);
  }

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
    return 'Test Hume prompt based on brief';
  }
}

// Mock configuration
const mockAgentConfig: AgentConfiguration = {
  id: 'test_agent',
  name: 'Test Agent',
  description: 'A test agent for validation',
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
      enableQuestionPaste: false,
    },
  },
  metadata: {
    version: '1.0.0',
    isActive: true,
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('Interview Type Registry - Smoke Tests', () => {
  let mockAgent: MockTestAgent;

  beforeEach(() => {
    // Create a fresh mock agent for each test
    mockAgent = new MockTestAgent(mockAgentConfig);
  });

  describe('Base Agent', () => {
    it('should create a base agent instance', () => {
      expect(mockAgent).toBeDefined();
      expect(mockAgent).toBeInstanceOf(BaseInterviewAgent);
    });

    it('should return correct agent ID', () => {
      expect(mockAgent.getId()).toBe('test_agent');
    });

    it('should return correct agent name', () => {
      expect(mockAgent.getName()).toBe('Test Agent');
    });

    it('should return system prompt', () => {
      const prompt = mockAgent.getSystemPrompt();
      expect(prompt).toBe('You are a test agent');
    });

    it('should generate a research brief', async () => {
      const request: GenerateBriefRequest = {
        interviewType: 'test_agent',
        userInput: {
          projectName: 'Test Project',
        },
      };

      const brief = await mockAgent.generateBrief(request);
      expect(brief).toBeDefined();
      expect(brief.objective).toBe('Test objective');
      expect(brief.learningGoals).toHaveLength(2);
      expect(brief.keyQuestions).toHaveLength(2);
    });

    it('should generate a Hume prompt from brief', async () => {
      const brief: ResearchBrief = {
        objective: 'Test objective',
        learningGoals: ['Goal 1'],
        keyQuestions: ['Question 1'],
        conversationFlow: [],
        generatedAt: new Date(),
        generatedBy: 'test',
      };

      const prompt = mockAgent.generateHumePrompt(brief);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should generate welcome message', () => {
      const message = mockAgent.generateWelcomeMessage();
      expect(message).toBeDefined();
      expect(message.role).toBe('assistant');
      expect(message.content).toContain('Test Agent');
    });

    it('should validate input correctly', () => {
      const validInput = { projectName: 'Test Project' };
      const invalidInput = { projectName: '' };

      const validResult = mockAgent.validateInput(validInput);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = mockAgent.validateInput(invalidInput);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should create initial interview state', () => {
      const state = mockAgent.createInitialState('test-interview-id');
      expect(state).toBeDefined();
      expect(state.interviewId).toBe('test-interview-id');
      expect(state.type).toBe('test_agent');
      expect(state.currentStep).toBe('project-brief');
      expect(state.completedSteps).toHaveLength(0);
    });
  });

  describe('Registry Operations', () => {
    it('should register a new agent', () => {
      // This test validates the registry can accept registrations
      // Note: We're testing the pattern, not actually registering to avoid pollution
      expect(() => {
        interviewTypeRegistry.register(mockAgent, mockConfig);
      }).not.toThrow();
    });

    it('should retrieve registered agent', () => {
      interviewTypeRegistry.register(mockAgent, mockConfig);
      const retrieved = interviewTypeRegistry.getAgent('test_agent');
      expect(retrieved).toBeDefined();
      expect(retrieved?.getId()).toBe('test_agent');
    });

    it('should retrieve configuration', () => {
      interviewTypeRegistry.register(mockAgent, mockConfig);
      const config = interviewTypeRegistry.getConfig('test_agent');
      expect(config).toBeDefined();
      expect(config?.agent.id).toBe('test_agent');
    });

    it('should check if type exists', () => {
      interviewTypeRegistry.register(mockAgent, mockConfig);
      expect(interviewTypeRegistry.hasType('test_agent')).toBe(true);
      expect(interviewTypeRegistry.hasType('non_existent')).toBe(false);
    });

    it('should get workflow steps', () => {
      interviewTypeRegistry.register(mockAgent, mockConfig);
      const steps = interviewTypeRegistry.getWorkflowSteps('test_agent');
      expect(steps).toBeDefined();
      expect(Array.isArray(steps)).toBe(true);
      expect(steps).toContain('step1');
    });

    it('should get UI features', () => {
      interviewTypeRegistry.register(mockAgent, mockConfig);
      const features = interviewTypeRegistry.getUIFeatures('test_agent');
      expect(features).toBeDefined();
      expect(features.enableUrlInput).toBe(false);
      expect(features.enableQuestionPaste).toBe(false);
    });

    it('should get all types', () => {
      interviewTypeRegistry.register(mockAgent, mockConfig);
      const types = interviewTypeRegistry.getAllTypes();
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('test_agent');
    });

    it('should validate registered type', () => {
      interviewTypeRegistry.register(mockAgent, mockConfig);
      const validation = interviewTypeRegistry.validateType('test_agent');
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for non-existent type', () => {
      const validation = interviewTypeRegistry.validateType('non_existent');
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('TypeScript Type Checking', () => {
    it('should accept valid agent configuration', () => {
      const config: AgentConfiguration = {
        id: 'type_test',
        name: 'Type Test Agent',
        description: 'Testing TypeScript types',
        systemPrompt: 'Test prompt',
        briefTemplate: {
          sections: [],
        },
        conversationFlow: {
          openingStyle: 'formal',
          questionStyle: 'structured',
          followUpStrategy: 'broad-coverage',
          closingStyle: 'next-steps',
        },
      };
      expect(config).toBeDefined();
    });

    it('should accept valid interview type config', () => {
      const config: InterviewTypeConfig = {
        agent: mockAgentConfig,
        workflow: {
          steps: [],
          requiredFields: [],
        },
        ui: {
          features: {},
        },
      };
      expect(config).toBeDefined();
    });
  });
});

// Export for potential use in other tests
export { MockTestAgent, mockAgentConfig, mockConfig };
