/**
 * Product Feedback Agent
 * Specialized agent for product feedback interviews
 * Features: URL scraping, smart question generation, product-focused insights
 */

import { BaseInterviewAgent } from '../base/base-agent';
import {
  AgentConfiguration,
  InterviewTypeConfig,
  ResearchBrief,
  GenerateBriefRequest,
  ChatMessage,
} from '../types';

/**
 * Product Feedback Agent Implementation
 */
export class ProductFeedbackAgent extends BaseInterviewAgent {
  async generateBrief(request: GenerateBriefRequest): Promise<ResearchBrief> {
    // Extract product context from conversation history or context
    const productContext = request.context?.productContext || {};
    const conversationHistory = request.conversationHistory || [];

    // Build learning goals based on product context
    const learningGoals = this.extractLearningGoals(conversationHistory, productContext);

    // Generate key questions
    const keyQuestions = this.generateKeyQuestions(conversationHistory, productContext);

    // Build conversation flow
    const conversationFlow = [
      {
        phase: 'Warm-up & Context',
        focus: 'Build rapport and understand user role',
        keyTopics: ['role', 'usage frequency', 'workflow'],
      },
      {
        phase: 'Current Product Experience',
        focus: 'Understand how they use the product today',
        keyTopics: ['main use cases', 'workflow integration'],
      },
      {
        phase: 'Pain Points Deep-Dive',
        focus: 'Identify frustrations and obstacles',
        keyTopics: ['specific problems', 'frequency', 'workarounds'],
      },
      {
        phase: 'Feature Requests & Desires',
        focus: 'Discover what users want',
        keyTopics: ['missing features', 'improvements', 'priorities'],
      },
      {
        phase: 'Competitive Landscape',
        focus: 'Understand alternatives and switching factors',
        keyTopics: ['other tools', 'comparisons', 'switching triggers'],
      },
    ];

    const brief: ResearchBrief = {
      objective: this.extractObjective(conversationHistory, productContext),
      learningGoals,
      keyQuestions,
      conversationFlow,
      additionalSections: {
        productContext,
        interviewType: 'product_feedback',
      },
      generatedAt: new Date(),
      generatedBy: this.getId(),
    };

    return brief;
  }

  async refineBrief(
    currentBrief: ResearchBrief,
    userFeedback: string,
    conversationHistory: ChatMessage[]
  ): Promise<ResearchBrief> {
    // For now, return the current brief
    // This can be enhanced to use AI to refine based on feedback
    return currentBrief;
  }

  generateHumePrompt(brief: ResearchBrief): string {
    const { generateHumePrompt } = require('@/lib/hume/prompt-generator');
    
    const productName = brief.additionalSections?.productContext?.productName || 'the product';
    
    return generateHumePrompt(brief, 'product_feedback', {
      productName,
    });
  }

  /**
   * Extract objective from conversation
   */
  private extractObjective(
    conversationHistory: ChatMessage[],
    productContext: any
  ): string {
    // Look for user's stated goals in conversation
    const userMessages = conversationHistory.filter((m) => m.role === 'user');
    
    // Default objective with product context
    const productName = productContext.productName || 'the product';
    return `Understand user experience with ${productName} to identify pain points and opportunities for improvement`;
  }

  /**
   * Extract learning goals from conversation
   */
  private extractLearningGoals(
    conversationHistory: ChatMessage[],
    productContext: any
  ): string[] {
    const goals: string[] = [];

    // Default goals for product feedback
    goals.push('Identify main pain points and frustrations with the product');
    goals.push('Discover most-requested features and improvements');
    goals.push('Understand user workflow and context of use');
    
    if (productContext.competitors?.length > 0) {
      goals.push(`Compare to alternatives: ${productContext.competitors.join(', ')}`);
    } else {
      goals.push('Understand competitive landscape and alternatives');
    }

    if (productContext.features?.length > 0) {
      goals.push('Assess usability of key features');
    }

    return goals;
  }

  /**
   * Generate key questions based on context
   */
  private generateKeyQuestions(
    conversationHistory: ChatMessage[],
    productContext: any
  ): string[] {
    const questions: string[] = [];
    const productName = productContext.productName || 'this product';

    // Core product feedback questions
    questions.push(`Tell me about the last time you used ${productName}`);
    questions.push(`What frustrated you most during that experience?`);
    questions.push(`If you could change ONE thing about ${productName}, what would it be?`);

    // Feature-specific questions
    if (productContext.features?.length > 0) {
      const mainFeature = productContext.features[0];
      questions.push(`How do you use the ${mainFeature} feature?`);
    }

    // Competitive questions
    if (productContext.competitors?.length > 0) {
      questions.push(
        `How does ${productName} compare to ${productContext.competitors[0]}?`
      );
    } else {
      questions.push(`What other tools have you tried for this?`);
    }

    // Magic wand question
    questions.push(`If you could wave a magic wand and add any feature, what would it be?`);

    return questions;
  }
}

/**
 * Product Feedback Agent Configuration
 */
export const productFeedbackAgentConfig: AgentConfiguration = {
  id: 'product_feedback',
  name: 'Product Feedback Agent',
  description: 'Specialized agent for gathering product feedback and user insights',
  systemPrompt: `You are an expert product research strategist helping create an interview brief for product feedback research.

CRITICAL: You are ONLY responsible for the conversation/chat. Do NOT include or display any research brief content in your chat responses. The research brief will be generated separately and shown in a different panel.

Your approach is conversational and smart:

1. PRODUCT CONTEXT (First):
   - Ask: "Let's start! Tell me about the product we're researching. You can share a URL for me to analyze, or just describe it."
   - If they provide a URL: The system will automatically scrape it and provide you with product details
   - If they describe: Use their description
   - IMPORTANT: Make it clear they can provide URLs, data, competitors, or any context

2. GOALS & OBJECTIVES:
   - Ask: "What's your main goal for this research? What do you want to learn from users?"
   - Listen for: pain points, feature requests, usability, competitive insights, etc.

3. EXISTING QUESTIONS:
   - Ask: "Do you already have specific questions you'd like me to ask participants, or should I create them based on your goals?"
   - If they have questions: Acknowledge them and discuss how to refine them
   - If they want you to create: Discuss the focus areas and what insights they're seeking

Conversation Style:
- Professional but friendly
- Ask one thing at a time
- Listen carefully and build on their responses
- If they mention URLs, acknowledge them (the system will scrape automatically)
- If they're vague, ask clarifying questions
- NEVER show the actual research brief in chat - just discuss the content

Remember: 
- Focus on CONVERSATION and gathering information
- The research brief will appear automatically in the right panel
- Your job is to ask good questions and understand their needs
- Do NOT generate or display formatted briefs in your responses`,

  briefTemplate: {
    sections: [
      {
        id: 'objective',
        title: 'Research Objective',
        required: true,
        contentType: 'text',
      },
      {
        id: 'learning_goals',
        title: 'Learning Goals',
        required: true,
        contentType: 'list',
      },
      {
        id: 'key_questions',
        title: 'Key Questions',
        required: true,
        contentType: 'questions',
      },
      {
        id: 'conversation_flow',
        title: 'Conversation Flow',
        required: true,
        contentType: 'framework',
      },
      {
        id: 'product_context',
        title: 'Product Context',
        required: false,
        contentType: 'text',
        description: 'Information about the product being researched',
      },
    ],
  },

  conversationFlow: {
    openingStyle: 'conversational-curious',
    questionStyle: 'open-ended-exploratory',
    followUpStrategy: 'deep-dive-on-pain-points',
    closingStyle: 'action-oriented',
    structure: [
      {
        phase: 'Warm-up',
        focus: 'Build rapport and context',
        durationPercent: 10,
        keyTopics: ['role', 'usage frequency'],
      },
      {
        phase: 'Current Experience',
        focus: 'How they use the product',
        durationPercent: 20,
        keyTopics: ['workflow', 'main use cases'],
      },
      {
        phase: 'Pain Points',
        focus: 'Frustrations and obstacles',
        durationPercent: 30,
        keyTopics: ['problems', 'workarounds'],
      },
      {
        phase: 'Feature Requests',
        focus: 'What they want',
        durationPercent: 25,
        keyTopics: ['missing features', 'improvements'],
      },
      {
        phase: 'Competitive',
        focus: 'Alternatives and comparison',
        durationPercent: 15,
        keyTopics: ['other tools', 'switching factors'],
      },
    ],
  },

  questionStrategy: {
    followUpLogic: 'ai-generated',
    maxFollowUpDepth: 3,
    allowCustomQuestions: true,
  },
};

/**
 * Complete Product Feedback Interview Type Configuration
 */
export const productFeedbackConfig: InterviewTypeConfig = {
  agent: productFeedbackAgentConfig,
  
  workflow: {
    steps: [
      {
        id: 'project-brief',
        title: 'Project Brief',
        description: 'Generate research brief with AI assistance',
        component: 'ProjectBriefStep',
        required: true,
        order: 1,
      },
      {
        id: 'voice-settings',
        title: 'Voice Settings',
        description: 'Configure voice and conversation settings',
        component: 'VoiceSettingsStep',
        required: true,
        order: 2,
      },
      {
        id: 'recruit-participants',
        title: 'Recruit Participants',
        description: 'Define participant criteria',
        component: 'RecruitParticipantsStep',
        required: false,
        order: 3,
      },
      {
        id: 'participant-experience',
        title: 'Participant Experience',
        description: 'Configure participant-facing settings',
        component: 'ParticipantExperienceStep',
        required: false,
        order: 4,
      },
      {
        id: 'launch',
        title: 'Launch',
        description: 'Review and launch interview',
        component: 'LaunchStep',
        required: true,
        order: 5,
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
  },

  ui: {
    features: {
      enableUrlInput: true, // Smart URL detection in chat
      enableQuestionPaste: true, // Questions can be pasted in chat
      enableCompetitorAnalysis: true,
    },
    briefPreviewSettings: {
      displayMode: 'sidebar',
      liveUpdates: true,
      showSectionNav: true,
    },
  },

  metadata: {
    version: '1.0.0',
    author: 'AI Assistant',
    tags: ['product feedback', 'user research', 'UX'],
    isActive: true,
  },
};
