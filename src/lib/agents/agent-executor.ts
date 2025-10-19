/**
 * Agent Executor
 * Executes agent actions with proper error handling and logging
 */

import {
  GenerateBriefRequest,
  GenerateBriefResponse,
  GenerateHumePromptRequest,
  GenerateHumePromptResponse,
  ResearchBrief,
  ChatMessage,
} from '../interview-types/types';
import {
  generateBriefWithAgent,
  refineBriefWithAgent,
  generateHumePromptWithAgent,
} from './agent-router';

/**
 * Action types that can be executed by agents
 */
export enum AgentAction {
  GENERATE_BRIEF = 'generate_brief',
  REFINE_BRIEF = 'refine_brief',
  GENERATE_HUME_PROMPT = 'generate_hume_prompt',
  VALIDATE_INPUT = 'validate_input',
}

/**
 * Execute an agent action with proper error handling
 */
export async function executeAgentAction<T = any>(
  action: AgentAction,
  payload: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    let result: any;

    switch (action) {
      case AgentAction.GENERATE_BRIEF:
        result = await executeGenerateBrief(payload);
        break;

      case AgentAction.REFINE_BRIEF:
        result = await executeRefineBrief(payload);
        break;

      case AgentAction.GENERATE_HUME_PROMPT:
        result = await executeGenerateHumePrompt(payload);
        break;

      case AgentAction.VALIDATE_INPUT:
        result = executeValidateInput(payload);
        break;

      default:
        throw new Error(`Unknown agent action: ${action}`);
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[AgentExecutor] Error executing ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute brief generation
 */
async function executeGenerateBrief(
  request: GenerateBriefRequest
): Promise<GenerateBriefResponse> {
  try {
    const brief = await generateBriefWithAgent(request);

    return {
      success: true,
      brief,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate brief',
    };
  }
}

/**
 * Execute brief refinement
 */
async function executeRefineBrief(payload: {
  interviewType: string;
  currentBrief: ResearchBrief;
  userFeedback: string;
  conversationHistory: ChatMessage[];
}): Promise<GenerateBriefResponse> {
  try {
    const { interviewType, currentBrief, userFeedback, conversationHistory } = payload;

    const brief = await refineBriefWithAgent(
      interviewType,
      currentBrief,
      userFeedback,
      conversationHistory
    );

    return {
      success: true,
      brief,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refine brief',
    };
  }
}

/**
 * Execute Hume prompt generation
 */
async function executeGenerateHumePrompt(
  request: GenerateHumePromptRequest
): Promise<GenerateHumePromptResponse> {
  try {
    const { brief, interviewType } = request;

    const prompt = generateHumePromptWithAgent(interviewType, brief);

    return {
      success: true,
      prompt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate Hume prompt',
    };
  }
}

/**
 * Execute input validation
 */
function executeValidateInput(payload: {
  interviewType: string;
  input: Record<string, any>;
}): { valid: boolean; errors: string[] } {
  const { routeToAgent } = require('./agent-router');
  const agent = routeToAgent(payload.interviewType);
  return agent.validateInput(payload.input);
}

/**
 * Batch execute multiple actions
 * Useful for executing multiple agent operations in sequence
 */
export async function executeBatchActions(
  actions: Array<{
    action: AgentAction;
    payload: any;
  }>
): Promise<
  Array<{
    success: boolean;
    data?: any;
    error?: string;
  }>
> {
  const results = [];

  for (const { action, payload } of actions) {
    const result = await executeAgentAction(action, payload);
    results.push(result);

    // Stop on first error if any action fails
    if (!result.success) {
      break;
    }
  }

  return results;
}

/**
 * Execute with timeout
 * Useful for preventing long-running agent operations
 */
export async function executeWithTimeout<T>(
  action: AgentAction,
  payload: any,
  timeoutMs: number = 30000
): Promise<{ success: boolean; data?: T; error?: string }> {
  return Promise.race([
    executeAgentAction<T>(action, payload),
    new Promise<{ success: false; error: string }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            success: false,
            error: `Action ${action} timed out after ${timeoutMs}ms`,
          }),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Execute with retry logic
 * Useful for handling transient failures (e.g., API rate limits)
 */
export async function executeWithRetry<T>(
  action: AgentAction,
  payload: any,
  maxRetries: number = 3,
  retryDelayMs: number = 1000
): Promise<{ success: boolean; data?: T; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await executeAgentAction<T>(action, payload);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry on the last attempt
    if (attempt < maxRetries) {
      console.log(
        `[AgentExecutor] Retry attempt ${attempt}/${maxRetries} after ${retryDelayMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
  };
}

/**
 * Logging and monitoring utilities
 */
export class AgentExecutionLogger {
  private logs: Array<{
    timestamp: Date;
    action: AgentAction;
    success: boolean;
    duration: number;
    error?: string;
  }> = [];

  async logExecution<T>(
    action: AgentAction,
    payload: any,
    executor: () => Promise<{ success: boolean; data?: T; error?: string }>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const startTime = Date.now();

    try {
      const result = await executor();
      const duration = Date.now() - startTime;

      this.logs.push({
        timestamp: new Date(),
        action,
        success: result.success,
        duration,
        error: result.error,
      });

      console.log(
        `[AgentExecutor] ${action} completed in ${duration}ms - ${
          result.success ? 'SUCCESS' : 'FAILURE'
        }`
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logs.push({
        timestamp: new Date(),
        action,
        success: false,
        duration,
        error: errorMessage,
      });

      console.error(`[AgentExecutor] ${action} failed after ${duration}ms:`, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  getSuccessRate(): number {
    if (this.logs.length === 0) return 0;
    const successful = this.logs.filter((log) => log.success).length;
    return (successful / this.logs.length) * 100;
  }

  getAverageDuration(): number {
    if (this.logs.length === 0) return 0;
    const total = this.logs.reduce((sum, log) => sum + log.duration, 0);
    return total / this.logs.length;
  }
}

// Global logger instance
export const agentLogger = new AgentExecutionLogger();
