/**
 * Base Interview Agent
 * Abstract base class that all specialized agents extend
 */

import {
  AgentConfiguration,
  ResearchBrief,
  ChatMessage,
  GenerateBriefRequest,
  InterviewState,
} from '../types';

export abstract class BaseInterviewAgent {
  protected config: AgentConfiguration;

  constructor(config: AgentConfiguration) {
    this.config = config;
  }

  /**
   * Get the agent configuration
   */
  getConfig(): AgentConfiguration {
    return this.config;
  }

  /**
   * Get the agent's unique identifier
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get the agent's display name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get the base system prompt for this agent
   */
  getSystemPrompt(): string {
    return this.config.systemPrompt;
  }

  /**
   * Get the brief template structure
   */
  getBriefTemplate() {
    return this.config.briefTemplate;
  }

  /**
   * Generate a research brief based on user input and conversation
   * This method should be implemented by each specialized agent
   */
  abstract generateBrief(
    request: GenerateBriefRequest
  ): Promise<ResearchBrief>;

  /**
   * Refine an existing research brief based on user feedback
   */
  abstract refineBrief(
    currentBrief: ResearchBrief,
    userFeedback: string,
    conversationHistory: ChatMessage[]
  ): Promise<ResearchBrief>;

  /**
   * Generate a Hume AI system prompt from a research brief
   * This converts the structured brief into a conversational prompt
   */
  abstract generateHumePrompt(brief: ResearchBrief): string;

  /**
   * Generate initial conversation messages for the chat interface
   * Used to guide the user through the brief creation process
   */
  generateWelcomeMessage(context?: Record<string, any>): ChatMessage {
    return {
      role: 'assistant',
      content: `Hello! I'm your ${this.config.name} research strategist. I'll help you create a comprehensive research brief for your interview. Let's start by understanding your goals and objectives.`,
      timestamp: new Date(),
    };
  }

  /**
   * Validate user input before proceeding
   */
  validateInput(input: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic validation - can be overridden by specialized agents
    if (!input.projectName || input.projectName.trim().length === 0) {
      errors.push('Project name is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Prepare context for OpenAI API calls
   * Combines system prompt with any additional context
   */
  protected prepareContextMessages(
    userInput: Record<string, any>,
    additionalContext?: Record<string, any>
  ): ChatMessage[] {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.config.systemPrompt,
      },
    ];

    // Add additional context if provided
    if (additionalContext) {
      const contextContent = this.formatAdditionalContext(additionalContext);
      if (contextContent) {
        messages.push({
          role: 'system',
          content: contextContent,
        });
      }
    }

    return messages;
  }

  /**
   * Format additional context into a message
   * Can be overridden by specialized agents for custom formatting
   */
  protected formatAdditionalContext(
    context: Record<string, any>
  ): string | null {
    return null; // Base implementation - no additional context
  }

  /**
   * Extract structured data from AI response
   * Parses the AI's response to populate the ResearchBrief structure
   */
  protected parseAIResponse(response: string): Partial<ResearchBrief> {
    // Base implementation - can be overridden for more sophisticated parsing
    return {
      objective: this.extractSection(response, 'Objective'),
      learningGoals: this.extractListSection(response, 'Learning Goals'),
      keyQuestions: this.extractListSection(response, 'Key Questions'),
    };
  }

  /**
   * Extract a single section from AI response
   */
  protected extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(
      `${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n[A-Z]|$)`,
      'i'
    );
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract a list section from AI response
   */
  protected extractListSection(text: string, sectionName: string): string[] {
    const sectionText = this.extractSection(text, sectionName);
    if (!sectionText) return [];

    // Split by line breaks and filter for list items
    return sectionText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-') || line.match(/^\d+\./))
      .map((line) => line.replace(/^[-\d.)\s]+/, '').trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Get conversation flow structure
   */
  getConversationFlow() {
    return this.config.conversationFlow;
  }

  /**
   * Create initial interview state
   */
  createInitialState(interviewId: string): InterviewState {
    return {
      interviewId,
      type: this.config.id,
      currentStep: 'project-brief',
      completedSteps: [],
      inputData: {},
    };
  }

  /**
   * Update interview state
   */
  updateState(
    currentState: InterviewState,
    updates: Partial<InterviewState>
  ): InterviewState {
    return {
      ...currentState,
      ...updates,
    };
  }
}
