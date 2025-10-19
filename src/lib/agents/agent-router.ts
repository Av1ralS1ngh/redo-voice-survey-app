/**
 * Agent Router
 * Routes interview requests to the appropriate specialized agent
 */

import { BaseInterviewAgent } from '../interview-types/base/base-agent';
import { getAgentByType, validateInterviewType } from '../interview-types/registry';
import {
  GenerateBriefRequest,
  ResearchBrief,
  ChatMessage,
} from '../interview-types/types';

/**
 * Route request to the appropriate agent
 */
export function routeToAgent(interviewType: string): BaseInterviewAgent {
  // Validate the interview type exists
  const validation = validateInterviewType(interviewType);
  if (!validation.valid) {
    throw new Error(
      `Invalid interview type: ${interviewType}. Errors: ${validation.errors.join(', ')}`
    );
  }

  // Get the agent from registry
  const agent = getAgentByType(interviewType);
  if (!agent) {
    throw new Error(`No agent found for interview type: ${interviewType}`);
  }

  return agent;
}

/**
 * Generate a research brief using the appropriate agent
 */
export async function generateBriefWithAgent(
  request: GenerateBriefRequest
): Promise<ResearchBrief> {
  const agent = routeToAgent(request.interviewType);
  
  try {
    const brief = await agent.generateBrief(request);
    return brief;
  } catch (error) {
    throw new Error(
      `Failed to generate brief with ${request.interviewType} agent: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Refine an existing research brief using the appropriate agent
 */
export async function refineBriefWithAgent(
  interviewType: string,
  currentBrief: ResearchBrief,
  userFeedback: string,
  conversationHistory: ChatMessage[]
): Promise<ResearchBrief> {
  const agent = routeToAgent(interviewType);
  
  try {
    const refinedBrief = await agent.refineBrief(
      currentBrief,
      userFeedback,
      conversationHistory
    );
    return refinedBrief;
  } catch (error) {
    throw new Error(
      `Failed to refine brief with ${interviewType} agent: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Generate a Hume AI system prompt from a research brief
 */
export function generateHumePromptWithAgent(
  interviewType: string,
  brief: ResearchBrief
): string {
  const agent = routeToAgent(interviewType);
  
  try {
    const prompt = agent.generateHumePrompt(brief);
    return prompt;
  } catch (error) {
    throw new Error(
      `Failed to generate Hume prompt with ${interviewType} agent: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Get welcome message for a specific interview type
 */
export function getWelcomeMessageForAgent(
  interviewType: string,
  context?: Record<string, any>
): ChatMessage {
  const agent = routeToAgent(interviewType);
  return agent.generateWelcomeMessage(context);
}

/**
 * Validate user input for a specific interview type
 */
export function validateInputWithAgent(
  interviewType: string,
  input: Record<string, any>
): { valid: boolean; errors: string[] } {
  const agent = routeToAgent(interviewType);
  return agent.validateInput(input);
}

/**
 * Get agent configuration for a specific interview type
 */
export function getAgentConfig(interviewType: string) {
  const agent = routeToAgent(interviewType);
  return agent.getConfig();
}

/**
 * Check if an interview type has an agent registered
 */
export function hasAgent(interviewType: string): boolean {
  try {
    const validation = validateInterviewType(interviewType);
    return validation.valid;
  } catch {
    return false;
  }
}

/**
 * Get all available interview types with their agents
 */
export function getAvailableInterviewTypes(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  // Import here to avoid circular dependency
  const { getAllInterviewTypes } = require('../interview-types/registry');
  return getAllInterviewTypes();
}
