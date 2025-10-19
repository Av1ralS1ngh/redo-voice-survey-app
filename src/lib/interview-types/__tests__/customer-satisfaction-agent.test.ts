/**
 * Unit Tests for Customer Satisfaction Agent
 * Tests the agent configuration, system prompt, and integration
 */

import { describe, it, expect } from '@jest/globals';
import { 
  CustomerSatisfactionAgent, 
  customerSatisfactionAgentConfig, 
  customerSatisfactionConfig 
} from '../agents/customer-satisfaction-agent';
import { interviewTypeRegistry } from '../registry';
import { BaseInterviewAgent } from '../base/base-agent';
import { ResearchBrief } from '../types';

describe('Customer Satisfaction Agent', () => {
  let agent: CustomerSatisfactionAgent;

  beforeEach(() => {
    agent = new CustomerSatisfactionAgent(customerSatisfactionAgentConfig);
  });

  // ============================================================================
  // Basic Agent Structure Tests
  // ============================================================================

  describe('Agent Configuration', () => {
    it('should create agent instance', () => {
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(BaseInterviewAgent);
      expect(agent).toBeInstanceOf(CustomerSatisfactionAgent);
    });

    it('should have correct agent ID', () => {
      expect(agent.getId()).toBe('customer_satisfaction');
    });

    it('should have correct agent name', () => {
      expect(agent.getName()).toBe('Customer Satisfaction');
    });

    it('should have descriptive name', () => {
      const config = agent.getConfig();
      expect(config.description).toContain('satisfaction');
      expect(config.description).toContain('retention');
    });

    it('should have system prompt', () => {
      const prompt = agent.getSystemPrompt();
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(1000); // Should be substantial
    });
  });

  // ============================================================================
  // System Prompt Content Validation
  // ============================================================================

  describe('System Prompt Structure', () => {
    let systemPrompt: string;

    beforeEach(() => {
      systemPrompt = agent.getSystemPrompt();
    });

    it('should include critical function calling instructions', () => {
      expect(systemPrompt).toContain('CRITICAL FUNCTION CALLING INSTRUCTION');
      expect(systemPrompt).toContain('generate_research_brief');
      expect(systemPrompt).toContain('WHEN TO CALL IT');
      expect(systemPrompt).toContain('HOW TO CALL IT');
    });

    it('should include core principles', () => {
      expect(systemPrompt).toContain('CORE PRINCIPLE: GENERATE FAST WITH INTELLIGENCE');
      expect(systemPrompt).toContain('WHAT USER TOLD YOU');
      expect(systemPrompt).toContain('DOMAIN INTELLIGENCE');
      expect(systemPrompt).toContain('EXPERT DEFAULTS');
    });

    it('should include domain intelligence section', () => {
      expect(systemPrompt).toContain('DOMAIN INTELLIGENCE - Satisfaction Dimensions');
      expect(systemPrompt).toContain('CORE DIMENSIONS');
      expect(systemPrompt).toContain('Quality/Performance');
      expect(systemPrompt).toContain('Ease of Use');
      expect(systemPrompt).toContain('Value for Money');
      expect(systemPrompt).toContain('Support/Service');
      expect(systemPrompt).toContain('Brand Trust & Loyalty');
    });

    it('should include product-specific dimension guidance', () => {
      expect(systemPrompt).toContain('PRODUCT-SPECIFIC ADDITIONS');
      expect(systemPrompt).toContain('Physical Products');
      expect(systemPrompt).toContain('Digital Products - SaaS');
      expect(systemPrompt).toContain('Digital Products - Consumer Apps');
      expect(systemPrompt).toContain('Services');
      expect(systemPrompt).toContain('Subscriptions');
      expect(systemPrompt).toContain('Emerging Tech');
    });

    it('should include dimension selection rule (Priority 1 addition)', () => {
      expect(systemPrompt).toContain('DIMENSION SELECTION RULE');
      expect(systemPrompt).toContain('How to Choose 4-6 Dimensions');
      expect(systemPrompt).toContain('STEP 1: Start with Core Dimensions');
      expect(systemPrompt).toContain('STEP 2: Add Product-Specific Dimensions');
      expect(systemPrompt).toContain('STEP 3: Prioritize Based on User\'s Problem');
      expect(systemPrompt).toContain('STEP 4: Fit to Time Budget');
    });

    it('should include time budget guidance (Priority 1 addition)', () => {
      expect(systemPrompt).toContain('TIME BUDGET RULE');
      expect(systemPrompt).toContain('45-min interviews → Maximum 4-5 dimensions');
      expect(systemPrompt).toContain('60-min interviews → Maximum 5-6 dimensions');
    });

    it('should include participant segmentation guidance', () => {
      expect(systemPrompt).toContain('PARTICIPANT SEGMENTATION');
      expect(systemPrompt).toContain('Highly Satisfied / Promoters');
      expect(systemPrompt).toContain('Moderately Satisfied / Passives');
      expect(systemPrompt).toContain('Dissatisfied / Detractors');
      expect(systemPrompt).toContain('NPS 9-10');
      expect(systemPrompt).toContain('NPS 7-8');
      expect(systemPrompt).toContain('NPS 0-6');
    });

    it('should include interview framework structure', () => {
      expect(systemPrompt).toContain('INTERVIEW FRAMEWORK');
      expect(systemPrompt).toContain('Structure Over Scripts');
      expect(systemPrompt).toContain('[Factual]');
      expect(systemPrompt).toContain('[Experiential]');
      expect(systemPrompt).toContain('[Emotional]');
      expect(systemPrompt).toContain('[Behavioral]');
    });

    it('should include example questions for key dimensions', () => {
      expect(systemPrompt).toContain('Quality/Performance:');
      expect(systemPrompt).toContain('Ease of Use:');
      expect(systemPrompt).toContain('Value for Money:');
      expect(systemPrompt).toContain('Support/Service:');
      expect(systemPrompt).toContain('Brand Trust & Loyalty:');
    });

    it('should include brief structure (6 sections)', () => {
      expect(systemPrompt).toContain('BRIEF STRUCTURE - 6 Sections');
      expect(systemPrompt).toContain('Project Overview & Objectives');
      expect(systemPrompt).toContain('Research Design & Participants');
      expect(systemPrompt).toContain('Interview Framework');
      expect(systemPrompt).toContain('Success Metrics & Analysis');
      expect(systemPrompt).toContain('Timeline & Logistics');
      expect(systemPrompt).toContain('Deliverables');
    });

    it('should include refinement conversation guidance', () => {
      expect(systemPrompt).toContain('REFINEMENT CONVERSATION');
      expect(systemPrompt).toContain('Focus only on churned users');
      expect(systemPrompt).toContain('Add a dimension about customer support');
    });

    it('should include critical reminders', () => {
      expect(systemPrompt).toContain('CRITICAL REMINDERS');
      expect(systemPrompt).toContain('Always segment by satisfaction level');
      expect(systemPrompt).toContain('Select 4-6 dimensions');
      expect(systemPrompt).toContain('Provide example questions, not full scripts');
    });

    it('should include chat message format example', () => {
      expect(systemPrompt).toContain('I\'ve generated your customer satisfaction research brief');
      expect(systemPrompt).toContain('What I included:');
      expect(systemPrompt).toContain('Review the brief on the right');
      expect(systemPrompt).toContain('Need adjustments?');
    });

    it('should include meal kit example', () => {
      expect(systemPrompt).toContain('meal kit');
      expect(systemPrompt).toContain('cancellations after 2-3 months');
      expect(systemPrompt).toContain('Food Quality');
      expect(systemPrompt).toContain('Delivery');
    });
  });

  // ============================================================================
  // Brief Template Tests
  // ============================================================================

  describe('Brief Template', () => {
    it('should have 6 sections', () => {
      const template = agent.getBriefTemplate();
      expect(template.sections).toHaveLength(6);
    });

    it('should have correct section IDs', () => {
      const template = agent.getBriefTemplate();
      const sectionIds = template.sections.map(s => s.id);
      
      expect(sectionIds).toContain('project_overview');
      expect(sectionIds).toContain('research_design');
      expect(sectionIds).toContain('interview_framework');
      expect(sectionIds).toContain('success_metrics');
      expect(sectionIds).toContain('timeline');
      expect(sectionIds).toContain('deliverables');
    });

    it('should have all required sections', () => {
      const template = agent.getBriefTemplate();
      const allRequired = template.sections.every(s => s.required === true);
      expect(allRequired).toBe(true);
    });

    it('should use markdown format', () => {
      const template = agent.getBriefTemplate();
      expect(template.format).toBe('markdown');
    });

    it('should include examples', () => {
      const template = agent.getBriefTemplate();
      expect(template.includeExamples).toBe(true);
    });

    it('should have interview framework section with framework content type', () => {
      const template = agent.getBriefTemplate();
      const frameworkSection = template.sections.find(s => s.id === 'interview_framework');
      
      expect(frameworkSection).toBeDefined();
      expect(frameworkSection?.contentType).toBe('framework');
    });
  });

  // ============================================================================
  // Conversation Flow Tests
  // ============================================================================

  describe('Conversation Flow', () => {
    it('should have conversational-curious opening style', () => {
      const config = agent.getConfig();
      expect(config.conversationFlow.openingStyle).toBe('conversational-curious');
    });

    it('should use open-ended exploratory questions', () => {
      const config = agent.getConfig();
      expect(config.conversationFlow.questionStyle).toBe('open-ended-exploratory');
    });

    it('should deep-dive on pain points', () => {
      const config = agent.getConfig();
      expect(config.conversationFlow.followUpStrategy).toBe('deep-dive-on-pain-points');
    });

    it('should have action-oriented closing', () => {
      const config = agent.getConfig();
      expect(config.conversationFlow.closingStyle).toBe('action-oriented');
    });

    it('should have structured conversation phases', () => {
      const config = agent.getConfig();
      expect(config.conversationFlow.structure).toBeDefined();
      expect(config.conversationFlow.structure?.length).toBeGreaterThan(0);
    });

    it('should include context setting phase', () => {
      const config = agent.getConfig();
      const phases = config.conversationFlow.structure?.map(s => s.phase) || [];
      expect(phases).toContain('Context Setting');
    });

    it('should include dimension selection phase', () => {
      const config = agent.getConfig();
      const phases = config.conversationFlow.structure?.map(s => s.phase) || [];
      expect(phases).toContain('Dimension Selection');
    });

    it('should include participant planning phase', () => {
      const config = agent.getConfig();
      const phases = config.conversationFlow.structure?.map(s => s.phase) || [];
      expect(phases).toContain('Participant Planning');
    });
  });

  // ============================================================================
  // Agent Methods Tests
  // ============================================================================

  describe('Agent Methods', () => {
    it('should generate welcome message', () => {
      const message = agent.generateWelcomeMessage();
      expect(message).toBeDefined();
      expect(message.role).toBe('assistant');
      expect(message.content).toContain('Customer Satisfaction');
      expect(message.timestamp).toBeDefined();
    });

    it('should validate valid input', () => {
      const result = agent.validateInput({ projectName: 'Test Project' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid input', () => {
      const result = agent.validateInput({ projectName: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should create initial state', () => {
      const state = agent.createInitialState('test-interview-123');
      expect(state).toBeDefined();
      expect(state.interviewId).toBe('test-interview-123');
      expect(state.type).toBe('customer_satisfaction');
      expect(state.currentStep).toBe('project-brief');
    });

    it('should generate Hume prompt from brief', () => {
      const mockBrief: ResearchBrief = {
        objective: 'Understand customer satisfaction',
        learningGoals: ['Identify satisfaction drivers'],
        keyQuestions: ['What makes you satisfied?'],
        conversationFlow: [],
        generatedAt: new Date(),
        generatedBy: 'customer_satisfaction',
      };

      const prompt = agent.generateHumePrompt(mockBrief);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Registry Integration Tests
  // ============================================================================

  describe('Registry Integration', () => {
    it('should be registered in the registry', () => {
      const hasType = interviewTypeRegistry.hasType('customer_satisfaction');
      expect(hasType).toBe(true);
    });

    it('should be retrievable from registry', () => {
      const retrievedAgent = interviewTypeRegistry.getAgent('customer_satisfaction');
      expect(retrievedAgent).toBeDefined();
      expect(retrievedAgent?.getId()).toBe('customer_satisfaction');
    });

    it('should have config in registry', () => {
      const config = interviewTypeRegistry.getConfig('customer_satisfaction');
      expect(config).toBeDefined();
      expect(config?.agent.id).toBe('customer_satisfaction');
    });

    it('should validate successfully', () => {
      const validation = interviewTypeRegistry.validateType('customer_satisfaction');
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should be included in all types', () => {
      const allTypes = interviewTypeRegistry.getAllTypes();
      expect(allTypes).toContain('customer_satisfaction');
    });

    it('should be included in active types', () => {
      const activeTypes = interviewTypeRegistry.getActiveTypes();
      const satisfactionType = activeTypes.find(t => t.id === 'customer_satisfaction');
      
      expect(satisfactionType).toBeDefined();
      expect(satisfactionType?.name).toBe('Customer Satisfaction');
    });
  });

  // ============================================================================
  // Interview Type Config Tests
  // ============================================================================

  describe('Interview Type Configuration', () => {
    it('should have correct workflow steps', () => {
      const steps = customerSatisfactionConfig.workflow.steps;
      expect(steps).toBeDefined();
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should include project_brief step', () => {
      const steps = customerSatisfactionConfig.workflow.steps;
      const briefStep = steps.find(s => s.id === 'project_brief');
      expect(briefStep).toBeDefined();
      expect(briefStep?.required).toBe(true);
    });

    it('should include voice_settings step', () => {
      const steps = customerSatisfactionConfig.workflow.steps;
      const voiceStep = steps.find(s => s.id === 'voice_settings');
      expect(voiceStep).toBeDefined();
    });

    it('should have required fields defined', () => {
      const requiredFields = customerSatisfactionConfig.workflow.requiredFields;
      expect(requiredFields).toBeDefined();
      expect(Array.isArray(requiredFields)).toBe(true);
    });

    it('should require projectName', () => {
      const requiredFields = customerSatisfactionConfig.workflow.requiredFields;
      const projectNameField = requiredFields.find(f => f.fieldName === 'projectName');
      expect(projectNameField).toBeDefined();
      expect(projectNameField?.validation).toBe('required');
    });

    it('should require researchBrief', () => {
      const requiredFields = customerSatisfactionConfig.workflow.requiredFields;
      const briefField = requiredFields.find(f => f.fieldName === 'researchBrief');
      expect(briefField).toBeDefined();
    });

    it('should have UI features configured', () => {
      const features = customerSatisfactionConfig.ui.features;
      expect(features).toBeDefined();
      expect(features.showChatInterface).toBe(true);
      expect(features.showBriefPreview).toBe(true);
      expect(features.allowSectionEditing).toBe(true);
      expect(features.showInterviewGuide).toBe(true);
    });

    it('should have metadata configured', () => {
      const metadata = customerSatisfactionConfig.metadata;
      expect(metadata).toBeDefined();
      expect(metadata.isActive).toBe(true);
      expect(metadata.version).toBe('1.0');
    });

    it('should have appropriate tags', () => {
      const tags = customerSatisfactionConfig.metadata.tags;
      expect(tags).toBeDefined();
      expect(tags).toContain('customer satisfaction');
      expect(tags).toContain('retention');
      expect(tags).toContain('NPS');
      expect(tags).toContain('loyalty');
      expect(tags).toContain('churn analysis');
    });

    it('should have category as measurement', () => {
      const category = customerSatisfactionConfig.metadata.category;
      expect(category).toBe('measurement');
    });

    it('should have recommended use cases', () => {
      const recommendedFor = customerSatisfactionConfig.metadata.recommendedFor;
      expect(recommendedFor).toBeDefined();
      expect(recommendedFor?.length).toBeGreaterThan(0);
      expect(recommendedFor).toContain('churn analysis');
      expect(recommendedFor).toContain('retention strategy');
    });

    it('should have estimated metrics', () => {
      const metadata = customerSatisfactionConfig.metadata;
      expect(metadata.avgBriefLength).toBe(4500);
      expect(metadata.avgGenerationTime).toBe(25);
    });
  });

  // ============================================================================
  // Validation Tests (Quality Checks)
  // ============================================================================

  describe('Quality Validations', () => {
    it('should enforce 4-6 dimension guideline in prompt', () => {
      const prompt = agent.getSystemPrompt();
      // Check that the prompt emphasizes 4-6 dimensions
      expect(prompt).toContain('4-6 dimensions');
      expect(prompt).toContain('Select 4-6');
      expect(prompt).not.toContain('7-8 dimensions'); // Should not encourage too many
    });

    it('should emphasize segmentation by satisfaction level', () => {
      const prompt = agent.getSystemPrompt();
      expect(prompt).toContain('ALWAYS segment by satisfaction level');
      expect(prompt).toContain('Promoters');
      expect(prompt).toContain('Passives');
      expect(prompt).toContain('Detractors');
    });

    it('should provide question framework, not scripts', () => {
      const prompt = agent.getSystemPrompt();
      expect(prompt).toContain('Interview framework over scripts');
      expect(prompt).toContain('example questions');
      expect(prompt).toContain('3 examples per dimension');
      expect(prompt).not.toContain('full verbatim script');
    });

    it('should ground briefs in user context', () => {
      const prompt = agent.getSystemPrompt();
      expect(prompt).toContain('GROUND BRIEF IN USER\'S ACTUAL SITUATION');
      expect(prompt).toContain('extract specifics');
      expect(prompt).toContain('echo their problems');
    });

    it('should use domain intelligence', () => {
      const prompt = agent.getSystemPrompt();
      expect(prompt).toContain('domain intelligence');
      expect(prompt).toContain('domain patterns');
      expect(prompt).toContain('best practices');
    });
  });
});

