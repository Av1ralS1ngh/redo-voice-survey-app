/**
 * Agent System - Public API
 * Exports the main interfaces for the agent system
 */

// Router
export {
  routeToAgent,
  generateBriefWithAgent,
  refineBriefWithAgent,
  generateHumePromptWithAgent,
  getWelcomeMessageForAgent,
  validateInputWithAgent,
  getAgentConfig,
  hasAgent,
  getAvailableInterviewTypes,
} from './agent-router';

// Executor
export {
  executeAgentAction,
  executeBatchActions,
  executeWithTimeout,
  executeWithRetry,
  AgentAction,
  AgentExecutionLogger,
  agentLogger,
} from './agent-executor';

// Base Agent (for creating specialized agents)
export { BaseInterviewAgent } from '../interview-types/base/base-agent';

// Types
export type {
  GenerateBriefRequest,
  GenerateBriefResponse,
  GenerateHumePromptRequest,
  GenerateHumePromptResponse,
  ResearchBrief,
  ChatMessage,
  AgentConfiguration,
} from '../interview-types/types';
