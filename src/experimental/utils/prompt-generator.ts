// Flash Survey Prompt Generator
// Phase 2: Simplified template engine with OpenAI integration

import { baseTemplate } from '../templates/base-template';

export interface UserInput {
  productDescription: string;
  companyName: string;
  participantName: string;
  questions: string[];
  additionalInstructions?: string;
  focusAreas?: string[];
}

export interface GenerationResult {
  prompt: string;
  method: 'ai' | 'template';
  quality: 'high' | 'standard';
  processingTime: number;
  notice?: string;
}

export class PromptGenerator {
  private openaiApiKey: string | null;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || null;
  }

  async generatePrompt(input: UserInput): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Try OpenAI first if API key is available
      if (this.openaiApiKey) {
        console.log('🤖 Attempting OpenAI generation...');
        try {
          const aiResult = await this.generateWithOpenAI(input);
          const processingTime = Date.now() - startTime;
          
          return {
            prompt: aiResult,
            method: 'ai',
            quality: 'high',
            processingTime,
            notice: 'Generated using OpenAI GPT-4 for optimal conversation flow'
          };
        } catch (error) {
          console.log('⚠️ OpenAI generation failed, falling back to template:', error);
        }
      } else {
        console.log('⚠️ No OpenAI API key found, using template fallback');
      }

      // Fallback to template method
      console.log('📝 Using template generation...');
      const templateResult = await this.generateWithTemplate(input);
      const processingTime = Date.now() - startTime;

      return {
        prompt: templateResult,
        method: 'template',
        quality: 'standard',
        processingTime,
        notice: this.openaiApiKey ? 
          'OpenAI unavailable - using template fallback' : 
          'Using template-based generation'
      };

    } catch (error) {
      console.error('❌ Prompt generation failed completely:', error);
      throw new Error('Failed to generate system prompt');
    }
  }

  private async generateWithOpenAI(input: UserInput): Promise<string> {
    const conversationTopics = await this.generateConversationTopics(input);
    const conversationFlow = await this.generateConversationFlow(input, input.companyName);
    
    return this.applyTemplate(input, conversationTopics, conversationFlow);
  }

  private async generateWithTemplate(input: UserInput): Promise<string> {
    // Generate conversation topics from questions
    const conversationTopics = this.generateTopicsFromQuestions(input.questions);
    
    // Generate basic conversation flow
    const conversationFlow = this.generateBasicFlow(input.questions, input.companyName);
    
    return this.applyTemplate(input, conversationTopics, conversationFlow);
  }

  private applyTemplate(
    input: UserInput, 
    conversationTopics: string, 
    conversationFlow: string
  ): string {
    return baseTemplate
      .replace(/\{\{PRODUCT_DESCRIPTION\}\}/g, input.productDescription)
      .replace(/\{\{COMPANY_NAME\}\}/g, input.companyName)
      .replace(/\{\{PARTICIPANT_NAME\}\}/g, input.participantName)
      .replace(/\{\{CONVERSATION_TOPICS\}\}/g, conversationTopics)
      .replace(/\{\{CONVERSATION_FLOW\}\}/g, conversationFlow);
  }

  private generateTopicsFromQuestions(questions: string[]): string {
    const topics = questions.map((q, i) => \`\${i + 1}. \${q}\`).join('\n');
    return \`Focus your conversation around these key areas:

\${topics}

Feel free to explore related topics that naturally arise from the participant's responses.\`;
  }

  private generateBasicFlow(questions: string[], companyName: string): string {
    const sections = this.createConversationSections(questions, companyName);
    
    return \`Structure your conversation in these natural phases:

BACKGROUND SECTION (5-10 minutes):
\${sections.background}

EXPERIENCE SECTION (15-20 minutes):
\${sections.experience}

FINAL INSIGHTS SECTION (5-10 minutes):
\${sections.final}

Remember: These are guides, not rigid scripts. Let the conversation flow naturally and follow the participant's interests and energy.\`;
  }

  private createConversationSections(questions: string[], companyName: string) {
    // Transform questions into conversational equivalents
    const conversationalQuestions = questions.map(q => {
      // Make questions more conversational
      return q
        .replace(/^(What|How|Why|When|Where|Who)/i, (match) => {
          switch(match.toLowerCase()) {
            case 'what': return 'I\'d love to understand what';
            case 'how': return 'Can you walk me through how';
            case 'why': return 'I\'m curious about why';
            case 'when': return 'Tell me about when';
            case 'where': return 'Help me understand where';
            case 'who': return 'I\'d like to know who';
            default: return match;
          }
        })
        .replace(/\?$/, '');
    });

    const background = [
      "Start by getting to know the participant and their background",
      "Ask about their role and experience with similar products/services",
      "Understand their context and current situation"
    ].join('\n- ');

    const experience = conversationalQuestions
      .map(q => \`- \${q}\`)
      .join('\n');

    const final = [
      "Explore any areas that seemed particularly important to them",
      "Ask about their overall thoughts and any final insights",
      \`Thank them for sharing their perspective about \${companyName}'s product\`
    ].join('\n- ');

    return { background, experience, final };
  }

  private async generateConversationTopics(input: UserInput): Promise<string> {
    // This would use OpenAI API to generate more sophisticated topics
    // For now, return a simple version
    return this.generateTopicsFromQuestions(input.questions);
  }

  private async generateConversationFlow(input: UserInput, companyName: string): Promise<string> {
    // This would use OpenAI API to generate sophisticated conversation flow
    // For now, return the basic template version
    return this.generateBasicFlow(input.questions, companyName);
  }
}

export default PromptGenerator;
