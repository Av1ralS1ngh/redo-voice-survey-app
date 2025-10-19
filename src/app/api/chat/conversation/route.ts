import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  CONVERSATION_AGENT_PROMPT, 
  ConversationInput, 
  ConversationOutput 
} from '@/lib/agents/conversation-agent';
import { getAgentByType } from '@/lib/interview-types/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Conversation Endpoint
 * 
 * Handles all post-generation chat interactions:
 * - Refinement requests
 * - Questions about the brief
 * - Contextual suggestions
 * - Conflict detection
 * 
 * This endpoint is called AFTER initial brief/guide generation
 * for ongoing conversation and refinement.
 */
export async function POST(req: NextRequest) {
  try {
    const input: ConversationInput = await req.json();
    
    const { 
      userMessage,
      briefContent,
      guideContent,
      chatHistory,
      interviewType,
      currentView,
      projectName,
      originalPrompt
    } = input;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Missing required field: userMessage' },
        { status: 400 }
      );
    }

    console.log('💬 [Conversation] Processing refinement message:', {
      userMessage: userMessage.substring(0, 100),
      currentView,
      interviewType,
      hasBrief: !!briefContent,
      hasGuide: !!guideContent,
      chatHistoryLength: chatHistory.length,
    });

    // Build context message with full brief/guide content
    const contextMessage = buildContextMessage({
      briefContent,
      guideContent,
      currentView,
      projectName,
      originalPrompt,
      interviewType,
    });

    // Prepare messages for OpenAI
    const messages: any[] = [
      {
        role: 'system',
        content: CONVERSATION_AGENT_PROMPT,
      },
      {
        role: 'user',
        content: contextMessage,
      },
    ];

    // Add chat history (excluding the current message)
    chatHistory.forEach(msg => {
      if (msg.content && msg.content.trim()) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Determine if we need function calling for regeneration
    const needsRegeneration = detectRegenerationIntent(userMessage);
    
    let tools: any[] | undefined;
    if (needsRegeneration) {
      // Add function calling for brief/guide regeneration
      const functionName = currentView === 'guide' 
        ? 'generate_interview_guide' 
        : 'generate_research_brief';
      
      tools = [
        {
          type: 'function' as const,
          function: {
            name: functionName,
            description: currentView === 'guide'
              ? 'Regenerate the interview guide with requested changes'
              : 'Regenerate the research brief with requested changes',
            parameters: {
              type: 'object',
              properties: currentView === 'guide' 
                ? {
                    guide_content: {
                      type: 'string',
                      description: 'The updated interview guide in markdown format',
                    },
                    version: {
                      type: 'number',
                      description: 'Incremented version number',
                    },
                  }
                : {
                    brief_content: {
                      type: 'string',
                      description: 'The updated research brief in markdown format',
                    },
                    sections_with_user_input: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Sections modified based on user input',
                    },
                    sections_with_recommendations: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Sections with AI recommendations',
                    },
                    version: {
                      type: 'number',
                      description: 'Incremented version number',
                    },
                  },
              required: currentView === 'guide' 
                ? ['guide_content', 'version']
                : ['brief_content', 'sections_with_user_input', 'sections_with_recommendations', 'version'],
            },
          },
        },
      ];
    }

    console.log('🤖 [Conversation] Calling OpenAI:', {
      messageCount: messages.length,
      hasFunctionCalling: !!tools,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: needsRegeneration ? 4000 : 800, // More tokens for regeneration
      tools,
      tool_choice: tools ? 'auto' : undefined,
    });

    const choice = completion.choices[0];
    let response = choice.message.content || '';
    const toolCalls = choice.message.tool_calls;

    console.log('✅ [Conversation] Response received:', {
      responseLength: response.length,
      hasToolCalls: !!toolCalls,
      toolCallsCount: toolCalls?.length || 0,
    });

    // Parse tool calls if present
    let updatedBrief: string | undefined;
    let updatedGuide: string | undefined;
    let metadata: any;

    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      if (currentView === 'guide') {
        updatedGuide = args.guide_content;
        metadata = { version: args.version };
      } else {
        updatedBrief = args.brief_content;
        metadata = {
          sections_with_user_input: args.sections_with_user_input,
          sections_with_recommendations: args.sections_with_recommendations,
          version: args.version,
        };
      }

      console.log('🔄 [Conversation] Brief/guide regeneration triggered:', {
        view: currentView,
        hasUpdate: !!(updatedBrief || updatedGuide),
        version: metadata?.version,
        hasResponseText: !!response,
      });

      // Generate fallback message if AI didn't provide one alongside the function call
      if (!response || response.trim().length === 0) {
        response = generateUpdateMessage(userMessage, currentView === 'guide');
        console.log('💬 [Conversation] Generated fallback message:', response.substring(0, 100));
      }
    }

    const output: ConversationOutput & {
      updatedBrief?: string;
      updatedGuide?: string;
      metadata?: any;
    } = {
      response,
      requiresRegeneration: !!toolCalls,
      updatedBrief,
      updatedGuide,
      metadata,
    };

    return NextResponse.json(output);

  } catch (error) {
    console.error('❌ [Conversation] Error:', error);
    
    return NextResponse.json({
      response: "I encountered an error processing your request. Could you rephrase that or try again?",
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Build context message with full brief/guide content
 */
function buildContextMessage({
  briefContent,
  guideContent,
  currentView,
  projectName,
  originalPrompt,
  interviewType,
}: {
  briefContent?: string;
  guideContent?: string;
  currentView: 'brief' | 'guide';
  projectName: string;
  originalPrompt?: string;
  interviewType: string;
}): string {
  let context = `## Project Context:\n`;
  context += `- Project Name: ${projectName}\n`;
  context += `- Interview Type: ${interviewType}\n`;
  if (originalPrompt) {
    context += `- Original User Request: ${originalPrompt}\n`;
  }
  context += `\n`;

  if (currentView === 'guide' && guideContent) {
    context += `## Current Interview Guide:\n${guideContent}\n\n`;
    if (briefContent) {
      context += `## Research Brief (for reference):\n${briefContent}\n\n`;
    }
  } else if (briefContent) {
    context += `## Current Research Brief:\n${briefContent}\n\n`;
  }

  context += `The user will now ask questions or request changes to the ${currentView === 'guide' ? 'interview guide' : 'research brief'}. `;
  context += `Provide helpful, contextual responses based on the content above.`;

  return context;
}

/**
 * Detect if user message requires brief/guide regeneration
 */
function detectRegenerationIntent(message: string): boolean {
  const regenerationKeywords = [
    'change',
    'update',
    'modify',
    'add',
    'remove',
    'increase',
    'decrease',
    'make it',
    'adjust',
    'revise',
    'edit',
    'replace',
    'switch to',
  ];

  const lowerMessage = message.toLowerCase();
  return regenerationKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Generate a fallback message when AI calls function but doesn't provide text
 */
function generateUpdateMessage(userMessage: string, isGuide: boolean): string {
  const contentType = isGuide ? 'interview guide' : 'research brief';
  
  // Extract what's being changed from the user message
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('participant')) {
    return `I've updated the ${contentType} with the new participant count. The segmentation and timeline have been adjusted accordingly.`;
  }
  
  if (lowerMessage.includes('duration') || lowerMessage.includes('minute') || lowerMessage.includes('time')) {
    return `I've adjusted the interview duration in the ${contentType}. The time allocation across sections has been updated to match.`;
  }
  
  if (lowerMessage.includes('dimension')) {
    return `I've updated the dimensions in the ${contentType}. The interview framework now reflects this change.`;
  }
  
  if (lowerMessage.includes('segment')) {
    return `I've modified the participant segmentation in the ${contentType} as requested.`;
  }
  
  // Generic fallback
  return `I've updated the ${contentType} based on your request. Please review the changes on the right.`;
}

