/**
 * Quick Smoke Tests for Base Workflow
 * Validates workflow step management and validation
 */

import { describe, it, expect } from '@jest/globals';
import { BaseWorkflow } from '../base/base-workflow';
import { WorkflowConfiguration, InterviewState } from '../types';

// ============================================================================
// Mock Workflow Configuration
// ============================================================================

const mockWorkflowConfig: WorkflowConfiguration = {
  steps: [
    {
      id: 'step1',
      title: 'Step 1',
      description: 'First step',
      component: 'Step1Component',
      required: true,
      order: 1,
    },
    {
      id: 'step2',
      title: 'Step 2',
      description: 'Second step',
      component: 'Step2Component',
      required: true,
      order: 2,
    },
    {
      id: 'step3',
      title: 'Step 3',
      description: 'Optional step',
      component: 'Step3Component',
      required: false,
      order: 3,
    },
  ],
  requiredFields: [
    {
      name: 'projectName',
      type: 'text',
      validation: '.+',
      errorMessage: 'Project name is required',
    },
  ],
};

const mockState: InterviewState = {
  interviewId: 'test-interview',
  type: 'test',
  currentStep: 'step1',
  completedSteps: [],
  inputData: {},
};

// ============================================================================
// Tests
// ============================================================================

describe('Base Workflow - Smoke Tests', () => {
  let workflow: BaseWorkflow;

  beforeEach(() => {
    workflow = new BaseWorkflow(mockWorkflowConfig);
  });

  describe('Basic Workflow Operations', () => {
    it('should create a workflow instance', () => {
      expect(workflow).toBeDefined();
      expect(workflow).toBeInstanceOf(BaseWorkflow);
    });

    it('should get all steps', () => {
      const steps = workflow.getSteps();
      expect(steps).toHaveLength(3);
      expect(steps[0].id).toBe('step1');
      expect(steps[1].id).toBe('step2');
      expect(steps[2].id).toBe('step3');
    });

    it('should get a specific step', () => {
      const step = workflow.getStep('step1');
      expect(step).toBeDefined();
      expect(step?.title).toBe('Step 1');
    });

    it('should return undefined for non-existent step', () => {
      const step = workflow.getStep('non_existent');
      expect(step).toBeUndefined();
    });
  });

  describe('Step Navigation', () => {
    it('should get next step', () => {
      const nextStep = workflow.getNextStep('step1');
      expect(nextStep).toBeDefined();
      expect(nextStep?.id).toBe('step2');
    });

    it('should return null when no next step', () => {
      const nextStep = workflow.getNextStep('step3');
      expect(nextStep).toBeNull();
    });

    it('should get previous step', () => {
      const prevStep = workflow.getPreviousStep('step2');
      expect(prevStep).toBeDefined();
      expect(prevStep?.id).toBe('step1');
    });

    it('should return null when no previous step', () => {
      const prevStep = workflow.getPreviousStep('step1');
      expect(prevStep).toBeNull();
    });
  });

  describe('Step Completion', () => {
    it('should check if step is completed', () => {
      const state = { ...mockState, completedSteps: ['step1'] };
      expect(workflow.isStepCompleted('step1', state)).toBe(true);
      expect(workflow.isStepCompleted('step2', state)).toBe(false);
    });

    it('should mark step as completed', () => {
      const newState = workflow.completeStep('step1', mockState);
      expect(newState.completedSteps).toContain('step1');
    });

    it('should not duplicate completed steps', () => {
      let state = workflow.completeStep('step1', mockState);
      state = workflow.completeStep('step1', state);
      expect(state.completedSteps.filter((s) => s === 'step1')).toHaveLength(1);
    });
  });

  describe('Step Access Control', () => {
    it('should allow proceeding to first step', () => {
      const canProceed = workflow.canProceedToStep('step1', mockState);
      expect(canProceed).toBe(true);
    });

    it('should not allow skipping required steps', () => {
      const canProceed = workflow.canProceedToStep('step2', mockState);
      expect(canProceed).toBe(false);
    });

    it('should allow proceeding when previous steps completed', () => {
      const state = { ...mockState, completedSteps: ['step1'] };
      const canProceed = workflow.canProceedToStep('step2', state);
      expect(canProceed).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress percentage', () => {
      const state1 = { ...mockState, completedSteps: [] };
      const progress1 = workflow.getProgress(state1);
      expect(progress1).toBe(0);

      const state2 = { ...mockState, completedSteps: ['step1'] };
      const progress2 = workflow.getProgress(state2);
      expect(progress2).toBe(50); // 1 of 2 required steps

      const state3 = { ...mockState, completedSteps: ['step1', 'step2'] };
      const progress3 = workflow.getProgress(state3);
      expect(progress3).toBe(100);
    });

    it('should check if workflow is complete', () => {
      const state1 = { ...mockState, completedSteps: ['step1'] };
      expect(workflow.isWorkflowComplete(state1)).toBe(false);

      const state2 = { ...mockState, completedSteps: ['step1', 'step2'] };
      expect(workflow.isWorkflowComplete(state2)).toBe(true);
    });
  });

  describe('Field Validation', () => {
    it('should validate required fields', () => {
      const state1 = {
        ...mockState,
        inputData: { projectName: 'Test Project' },
      };
      const validation1 = workflow.validateStep('step1', state1);
      expect(validation1.valid).toBe(true);

      const state2 = { ...mockState, inputData: { projectName: '' } };
      const validation2 = workflow.validateStep('step1', state2);
      expect(validation2.valid).toBe(false);
      expect(validation2.errors.projectName).toBeDefined();
    });
  });

  describe('Conditional Display', () => {
    it('should display steps without conditions', () => {
      const step = workflow.getStep('step1');
      expect(workflow.shouldDisplayStep(step!, mockState)).toBe(true);
    });

    it('should get visible steps', () => {
      const visibleSteps = workflow.getVisibleSteps(mockState);
      expect(visibleSteps.length).toBeGreaterThan(0);
    });
  });
});

export { mockWorkflowConfig };
