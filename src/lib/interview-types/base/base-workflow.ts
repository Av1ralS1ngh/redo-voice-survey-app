/**
 * Base Workflow
 * Manages the wizard step flow and validation for interview creation
 */

import {
  WorkflowConfiguration,
  WorkflowStep,
  InterviewState,
  RequiredField,
} from '../types';

export class BaseWorkflow {
  protected config: WorkflowConfiguration;

  constructor(config: WorkflowConfiguration) {
    this.config = config;
  }

  /**
   * Get all workflow steps
   */
  getSteps(): WorkflowStep[] {
    return this.config.steps.sort((a, b) => a.order - b.order);
  }

  /**
   * Get a specific step by ID
   */
  getStep(stepId: string): WorkflowStep | undefined {
    return this.config.steps.find((step) => step.id === stepId);
  }

  /**
   * Get the next step after the current one
   */
  getNextStep(currentStepId: string): WorkflowStep | null {
    const steps = this.getSteps();
    const currentIndex = steps.findIndex((step) => step.id === currentStepId);

    if (currentIndex === -1 || currentIndex === steps.length - 1) {
      return null;
    }

    return steps[currentIndex + 1];
  }

  /**
   * Get the previous step
   */
  getPreviousStep(currentStepId: string): WorkflowStep | null {
    const steps = this.getSteps();
    const currentIndex = steps.findIndex((step) => step.id === currentStepId);

    if (currentIndex <= 0) {
      return null;
    }

    return steps[currentIndex - 1];
  }

  /**
   * Check if a step should be displayed based on conditional logic
   */
  shouldDisplayStep(
    step: WorkflowStep,
    state: InterviewState
  ): boolean {
    if (!step.conditionalDisplay) {
      return true;
    }

    const { field, operator, value } = step.conditionalDisplay;
    const fieldValue = state.inputData[field];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not-equals':
        return fieldValue !== value;
      case 'contains':
        return Array.isArray(fieldValue) && fieldValue.includes(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return true;
    }
  }

  /**
   * Get all visible steps based on current state
   */
  getVisibleSteps(state: InterviewState): WorkflowStep[] {
    const steps = this.getSteps();
    return steps.filter((step) => this.shouldDisplayStep(step, state));
  }

  /**
   * Check if a step is completed
   */
  isStepCompleted(stepId: string, state: InterviewState): boolean {
    return state.completedSteps.includes(stepId);
  }

  /**
   * Check if user can proceed to a specific step
   */
  canProceedToStep(
    targetStepId: string,
    state: InterviewState
  ): boolean {
    const steps = this.getVisibleSteps(state);
    const targetIndex = steps.findIndex((step) => step.id === targetStepId);

    if (targetIndex === -1) {
      return false;
    }

    // Check if all previous required steps are completed
    for (let i = 0; i < targetIndex; i++) {
      const step = steps[i];
      if (step.required && !this.isStepCompleted(step.id, state)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate required fields for the current step
   */
  validateStep(
    stepId: string,
    state: InterviewState
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Get required fields for this step
    const requiredFields = this.getRequiredFieldsForStep(stepId);

    for (const field of requiredFields) {
      const value = state.inputData[field.name];

      // Check if field exists
      if (value === undefined || value === null || value === '') {
        errors[field.name] = field.errorMessage || `${field.name} is required`;
        continue;
      }

      // Type validation
      if (!this.validateFieldType(value, field.type)) {
        errors[field.name] = `${field.name} must be of type ${field.type}`;
        continue;
      }

      // Custom validation
      if (field.validation) {
        const validationError = this.validateFieldCustom(
          value,
          field.validation
        );
        if (validationError) {
          errors[field.name] = validationError;
        }
      }
    }

    // Apply workflow-level validation rules
    if (this.config.validationRules) {
      for (const rule of this.config.validationRules) {
        const value = state.inputData[rule.field];
        if (!this.applyValidationRule(value, rule.rule)) {
          errors[rule.field] = rule.message;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Get required fields for a specific step
   */
  protected getRequiredFieldsForStep(stepId: string): RequiredField[] {
    // This can be overridden by specific workflows
    // For now, return all required fields
    return this.config.requiredFields || [];
  }

  /**
   * Validate field type
   */
  protected validateFieldType(value: any, type: string): boolean {
    switch (type) {
      case 'text':
        return typeof value === 'string';
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'json':
        return typeof value === 'object';
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Apply custom validation
   */
  protected validateFieldCustom(
    value: any,
    validation: string
  ): string | null {
    // This can be extended with custom validation logic
    // For now, treat validation as a regex pattern
    try {
      const regex = new RegExp(validation);
      if (!regex.test(String(value))) {
        return 'Invalid format';
      }
    } catch (e) {
      // Invalid regex, skip validation
    }
    return null;
  }

  /**
   * Apply validation rule
   */
  protected applyValidationRule(value: any, rule: string): boolean {
    // This can be extended with custom rules
    // For now, treat as regex
    try {
      const regex = new RegExp(rule);
      return regex.test(String(value));
    } catch {
      return true; // Invalid rule, pass validation
    }
  }

  /**
   * Mark a step as completed
   */
  completeStep(stepId: string, state: InterviewState): InterviewState {
    if (!state.completedSteps.includes(stepId)) {
      return {
        ...state,
        completedSteps: [...state.completedSteps, stepId],
      };
    }
    return state;
  }

  /**
   * Get progress percentage
   */
  getProgress(state: InterviewState): number {
    const visibleSteps = this.getVisibleSteps(state);
    const totalSteps = visibleSteps.filter((step) => step.required).length;
    const completedSteps = state.completedSteps.filter((stepId) => {
      const step = this.getStep(stepId);
      return step && step.required;
    }).length;

    if (totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Check if workflow is complete
   */
  isWorkflowComplete(state: InterviewState): boolean {
    const visibleSteps = this.getVisibleSteps(state);
    const requiredSteps = visibleSteps.filter((step) => step.required);

    return requiredSteps.every((step) =>
      state.completedSteps.includes(step.id)
    );
  }
}
