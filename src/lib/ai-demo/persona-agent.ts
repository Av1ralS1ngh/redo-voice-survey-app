/**
 * Persona Agent - Simulates participant behavior using GPT-4o
 * Each persona has unique characteristics that affect their responses
 */

import OpenAI from 'openai';
import { Persona, ConversationMessage } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MOCK_AI_DEMO_FLAG = process.env.MOCK_AI_DEMO === 'true';

const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

const SHOULD_USE_MOCK = !openai || MOCK_AI_DEMO_FLAG;

export class PersonaAgent {
  private persona: Persona;
  private conversationHistory: ConversationMessage[] = [];
  private currentFatigue: number = 0;
  private currentFrustration: number = 0;
  private questionsAnswered: number = 0;

  constructor(persona: Persona) {
    this.persona = persona;
  }

  /**
   * Generate system prompt based on persona characteristics
   */
  private getSystemPrompt(): string {
    const { name, description, traits, behaviorModel, responsePatterns } = this.persona;
    
    return `You are roleplaying as a research interview participant with the following characteristics:

**Persona: ${name}**
${description}

**Core Traits:**
${traits.map(t => `- ${t}`).join('\n')}

**Behavior Guidelines:**
- Comprehension Level: ${behaviorModel.comprehension}
  ${behaviorModel.comprehension === 'low' ? '→ Often misunderstand questions, interpret them incorrectly, or miss key points' : ''}
  ${behaviorModel.comprehension === 'medium' ? '→ Sometimes need clarification, may miss nuances' : ''}
  ${behaviorModel.comprehension === 'high' ? '→ Understand questions quickly and accurately' : ''}

- Cooperativeness: ${behaviorModel.cooperativeness}%
  ${behaviorModel.cooperativeness < 50 ? '→ Reluctant to engage, may refuse questions or give minimal responses' : ''}
  ${behaviorModel.cooperativeness >= 50 && behaviorModel.cooperativeness < 80 ? '→ Generally cooperative but not always enthusiastic' : ''}
  ${behaviorModel.cooperativeness >= 80 ? '→ Highly cooperative and engaged' : ''}

- Off-Topic Tendency: ${Math.round(behaviorModel.tangentRate * 100)}%
  ${behaviorModel.tangentRate > 0.3 ? '→ Frequently go on tangents, bring up unrelated topics, share irrelevant stories' : ''}
  ${behaviorModel.tangentRate > 0 && behaviorModel.tangentRate <= 0.3 ? '→ Occasionally drift slightly off-topic' : ''}

- Current Fatigue: ${this.currentFatigue}%
  ${this.currentFatigue > 50 ? '→ Show signs of tiredness, shorter responses, less enthusiasm' : ''}
  ${this.currentFatigue > 70 ? '→ Very tired, may want to end interview, minimal effort' : ''}

- Current Frustration: ${this.currentFrustration}%
  ${this.currentFrustration > this.persona.behaviorModel.frustrationThreshold ? '→ Visibly frustrated, may use mild profanity, push back on questions' : ''}

**Response Style:**
- Average response length: ${responsePatterns.averageWordCount} words (±20%)
- Detail level: ${responsePatterns.detailLevel}
- Be conversational and natural, like a real person in an interview
${responsePatterns.detailLevel === 'low' ? '- Keep responses brief and sometimes vague' : ''}
${responsePatterns.detailLevel === 'high' ? '- Provide rich detail and examples' : ''}

**Important Rules:**
1. Stay in character at all times
2. Respond naturally as this persona would - don't break character or explain behavior
3. If you're confused (low comprehension), answer based on your misunderstanding
4. If frustrated beyond threshold, you may refuse to continue or become difficult
5. If fatigued (>70%), you may ask to end the interview or give very short answers
6. Only ask for clarification based on your clarificationLikelihood (${Math.round(behaviorModel.clarificationLikelihood * 100)}%)
7. If going off-topic (${Math.round(behaviorModel.tangentRate * 100)}% chance), do so naturally

**🚨 CRITICAL - GOODBYE HANDLING:**
8. If the interviewer is closing/wrapping up (thanking you, saying goodbye, concluding the interview):
   → Respond with EXACTLY ONE brief, polite goodbye (5-10 words max)
   → Examples: "Thank you! Take care!" or "You're welcome, goodbye!" or "Thanks, bye!"
   → DO NOT ask questions
   → DO NOT elaborate
   → DO NOT say "let me know if you need anything else"
   → DO NOT continue the conversation in any way
   → Just say goodbye and STOP

**Context:**
You are participating in a user research interview conducted by an AI agent. Answer questions as this persona would, maintaining consistency throughout the conversation.`;
  }

  /**
   * Respond to an agent question
   */
  async respondTo(agentMessage: string, metadata?: { questionId?: string }): Promise<{
    response: string;
    shouldContinue: boolean;
    dropOffReason?: string;
  }> {
    this.questionsAnswered++;
    
    // Update fatigue (increases over time)
    this.currentFatigue += this.persona.behaviorModel.fatigueRate * 10;
    
    // Chance of frustration (especially for difficult persona)
    if (Math.random() < 0.15 && this.persona.id === 'difficult') {
      this.currentFrustration += 15;
    }

    // Check if participant wants to drop off
    if (this.currentFatigue > 85 && this.persona.behaviorModel.cooperativeness < 70) {
      return {
        response: this.getDropOffMessage(),
        shouldContinue: false,
        dropOffReason: 'Fatigue and low cooperativeness'
      };
    }

    if (this.currentFrustration > this.persona.behaviorModel.frustrationThreshold + 30) {
      return {
        response: this.getFrustratedDropOffMessage(),
        shouldContinue: false,
        dropOffReason: 'High frustration'
      };
    }

    // Add agent message to history
    this.conversationHistory.push({
      role: 'agent',
      content: agentMessage,
      timestamp: Date.now(),
      metadata
    });

    if (SHOULD_USE_MOCK || !openai) {
      return this.generateMockResponse(metadata);
    }

    try {
      // Generate response using OpenAI
      const completion = await openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          ...this.conversationHistory.map(msg => ({
            role: msg.role === 'agent' ? 'user' as const : 'assistant' as const,
            content: msg.content
          }))
        ],
        temperature: 0.8, // Higher temperature for more varied, natural responses
        max_tokens: 300,
      });

      const response = completion.choices[0].message.content || "I'm not sure what to say.";

      // Add user response to history
      this.conversationHistory.push({
        role: 'user',
        content: response,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          wordCount: response.split(' ').length,
          duration: this.persona.responsePatterns.responseTime
        }
      });

      return this.commitAssistantResponse(response, metadata);
    } catch (error) {
      console.error('Error generating persona response:', error);
      
      if (!SHOULD_USE_MOCK) {
        return {
          response: this.getFallbackResponse(),
          shouldContinue: true
        };
      }

      return this.generateMockResponse(metadata);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      fatigue: this.currentFatigue,
      frustration: this.currentFrustration,
      questionsAnswered: this.questionsAnswered,
      totalMessages: this.conversationHistory.length
    };
  }

  /**
   * Drop-off messages
   */
  private getDropOffMessage(): string {
    const messages = [
      "Sorry, I'm getting pretty tired. Can we wrap this up?",
      "I think I need to go now, this is taking longer than I expected.",
      "I'm not really feeling this anymore. Can we end here?",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getFrustratedDropOffMessage(): string {
    const messages = [
      "Look, I don't think this is working out. I'm done.",
      "This is frustrating. I don't want to continue.",
      "Sorry, but I'm not comfortable with this. I'd like to stop.",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getFallbackResponse(): string {
    const responses = [
      "I'm not sure I understand the question.",
      "Can you rephrase that?",
      "Hmm, I don't know.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateMockResponse(
    metadata?: ConversationMessage['metadata']
  ): {
    response: string;
    shouldContinue: boolean;
  } {
    const lastAgentMessage = this.conversationHistory
      .slice()
      .reverse()
      .find((msg) => msg.role === 'agent');

    const agentContent = lastAgentMessage?.content || '';
    const normalizedAgentContent = agentContent
      ? agentContent.toLowerCase()
      : 'that question you just asked';
    const traitsSummary = this.persona.traits.slice(0, 2).join(' and ');

    const clarityChance = this.persona.behaviorModel.clarificationLikelihood;
    const isConfused = clarityChance > 0.4 && Math.random() < clarityChance;

    let response: string;

    if (isConfused) {
      const reference = agentContent ? agentContent.slice(0, 60) : 'that';
      response = `I'm not totally sure what you mean when you mention "${reference}". Could you rephrase it a bit?`;
    } else {
      const tone = this.persona.responsePatterns.detailLevel === 'high'
        ? 'Let me walk you through how this usually shows up for me. '
        : this.persona.responsePatterns.detailLevel === 'low'
        ? 'Honestly, '
        : 'Typically, ';

      const cooperationTail = this.persona.behaviorModel.cooperativeness < 50
        ? " I tend to be a little skeptical about these things, so I keep answers short."
        : this.persona.behaviorModel.cooperativeness > 80
        ? ' I love diving into this because it impacts my day-to-day so much.'
        : '';

  response = `${tone}${normalizedAgentContent}? In my experience it all comes back to ${traitsSummary.toLowerCase()}.${cooperationTail}`;
    }

    const metadataToUse = metadata ?? lastAgentMessage?.metadata;
    return this.commitAssistantResponse(response, metadataToUse);
  }

  private commitAssistantResponse(
    content: string,
    metadata?: ConversationMessage['metadata']
  ): {
    response: string;
    shouldContinue: boolean;
  } {
    this.conversationHistory.push({
      role: 'user',
      content,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        wordCount: content.split(' ').length,
        duration: this.persona.responsePatterns.responseTime
      }
    });

    return {
      response: content,
      shouldContinue: true
    };
  }
}

