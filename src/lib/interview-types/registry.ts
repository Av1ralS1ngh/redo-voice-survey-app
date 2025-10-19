/**
 * Interview Type Registry
 * Central registry for all interview types and their configurations
 */

import { InterviewTypeConfig } from './types';
import { BaseInterviewAgent } from './base/base-agent';

// Import specialized agents
// import { CustomAgent } from './agents/custom-agent';
import { ProductFeedbackAgent, productFeedbackConfig } from './agents/product-feedback-agent';
import { UsabilityTestingAgent, usabilityTestingConfig } from './agents/usability-testing-agent';
import { CustomerSatisfactionAgent, customerSatisfactionConfig } from './agents/customer-satisfaction-agent';
import { ConceptTestingAgent, conceptTestingConfig } from './agents/concept-testing-agent';

/**
 * Registry of all available interview types
 */
class InterviewTypeRegistry {
  private agents: Map<string, BaseInterviewAgent> = new Map();
  private configs: Map<string, InterviewTypeConfig> = new Map();

  /**
   * Register a new interview type
   */
  register(agent: BaseInterviewAgent, config: InterviewTypeConfig): void {
    const id = agent.getId();
    this.agents.set(id, agent);
    this.configs.set(id, config);
  }

  /**
   * Get agent by type
   */
  getAgent(type: string): BaseInterviewAgent | undefined {
    return this.agents.get(type);
  }

  /**
   * Get configuration by type
   */
  getConfig(type: string): InterviewTypeConfig | undefined {
    return this.configs.get(type);
  }

  /**
   * Get workflow steps for a type
   */
  getWorkflowSteps(type: string): string[] {
    const config = this.configs.get(type);
    if (!config) return [];
    
    return config.workflow.steps
      .sort((a, b) => a.order - b.order)
      .map(step => step.id);
  }

  /**
   * Get UI features for a type
   */
  getUIFeatures(type: string): Record<string, boolean> {
    const config = this.configs.get(type);
    if (!config) return {};
    
    return config.ui.features as Record<string, boolean>;
  }

  /**
   * Check if a type exists
   */
  hasType(type: string): boolean {
    return this.agents.has(type);
  }

  /**
   * Get all available types
   */
  getAllTypes(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get all active types (based on metadata)
   */
  getActiveTypes(): Array<{ id: string; name: string; description: string }> {
    const activeTypes: Array<{ id: string; name: string; description: string }> = [];
    
    this.configs.forEach((config, id) => {
      if (config.metadata?.isActive !== false) {
        const agent = this.agents.get(id);
        if (agent) {
          activeTypes.push({
            id: id,
            name: agent.getName(),
            description: agent.getConfig().description,
          });
        }
      }
    });
    
    return activeTypes;
  }

  /**
   * Validate that a type is properly configured
   */
  validateType(type: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.hasType(type)) {
      errors.push(`Interview type '${type}' not found in registry`);
      return { valid: false, errors };
    }
    
    const agent = this.agents.get(type);
    const config = this.configs.get(type);
    
    if (!agent) {
      errors.push(`Agent not found for type '${type}'`);
    }
    
    if (!config) {
      errors.push(`Configuration not found for type '${type}'`);
    }
    
    // Validate workflow steps
    if (config && (!config.workflow.steps || config.workflow.steps.length === 0)) {
      errors.push(`No workflow steps defined for type '${type}'`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Create singleton instance
const registry = new InterviewTypeRegistry();

// ============================================================================
// Register Interview Types
// ============================================================================

// Register Product Feedback Agent
const productFeedbackAgent = new ProductFeedbackAgent(productFeedbackConfig.agent);
registry.register(productFeedbackAgent, productFeedbackConfig);

// Register Usability Testing Agent
const usabilityTestingAgent = new UsabilityTestingAgent(usabilityTestingConfig.agent);
registry.register(usabilityTestingAgent, usabilityTestingConfig);

// Register Customer Satisfaction Agent
const customerSatisfactionAgent = new CustomerSatisfactionAgent(customerSatisfactionConfig.agent);
registry.register(customerSatisfactionAgent, customerSatisfactionConfig);

// Register Concept Testing Agent
const conceptTestingAgent = new ConceptTestingAgent(conceptTestingConfig.agent);
registry.register(conceptTestingAgent, conceptTestingConfig);

// TODO: Register other agents as they're created
// import { CustomAgent } from './agents/custom-agent';
// import { customAgentConfig } from './agents/custom-agent';
// registry.register(new CustomAgent(customAgentConfig.agent), customAgentConfig);

// ============================================================================
// Export
// ============================================================================

export { registry as interviewTypeRegistry };

/**
 * Convenience functions for accessing the registry
 */

export function getAgentByType(type: string): BaseInterviewAgent | undefined {
  return registry.getAgent(type);
}

export function getConfigByType(type: string): InterviewTypeConfig | undefined {
  return registry.getConfig(type);
}

export function getWorkflowSteps(type: string): string[] {
  return registry.getWorkflowSteps(type);
}

export function getUIFeatures(type: string): Record<string, boolean> {
  return registry.getUIFeatures(type);
}

export function getAllInterviewTypes(): Array<{ id: string; name: string; description: string }> {
  return registry.getActiveTypes();
}

export function validateInterviewType(type: string): { valid: boolean; errors: string[] } {
  return registry.validateType(type);
}
