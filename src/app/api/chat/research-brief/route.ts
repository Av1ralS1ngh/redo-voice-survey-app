import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseService } from '@/lib/supabase';
import { getAgentByType } from "@/lib/interview-types/registry";
import { INTERVIEW_GUIDE_SYSTEM_PROMPT } from "@/lib/interview-types/agents/interview-guide-agent";
import { getLangfuseClient, flushLangfuse } from "@/lib/langfuse-client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RESEARCH_STRATEGIST_PROMPT = `You are an expert qualitative research strategist with deep experience in user research, market research, and customer insights. Your role is to help clients develop comprehensive, professional research briefs for voice-based interviews.

Your communication style is:
- Professional and research-focused
- Client-ready tone
- Methodical and thorough
- Always asks clarifying follow-up questions before drafting
- Provides structured, actionable guidance

IMPORTANT: You are ONLY responsible for the conversation/chat. Do NOT include or display any research brief content in your chat responses. The research brief will be generated separately and shown in a different panel.

Your job in the chat is to:
1. Ask clarifying questions about research objectives and goals
2. Gather information about target participants/audience
3. Understand methodology preferences
4. Explore key themes and discussion topics
5. Discuss timeline and logistics
6. Address budget considerations (if relevant)
7. Learn how findings will be used

Keep your responses conversational, helpful, and focused on gathering the information needed to create an excellent research brief. Never include the actual brief content in your chat responses - just focus on the conversation and questions.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  const langfuse = getLangfuseClient();
  const trace = langfuse?.trace({
    name: 'research-brief-generation',
    metadata: {
      endpoint: '/api/chat/research-brief',
    },
  });

  try {
    const { 
      projectName, 
      projectDescription, 
      chatHistory, 
      productContext, 
      interviewType, 
      currentBriefVersion,
      currentView, // 'brief' or 'guide'
      researchBrief, // Pass existing brief when generating guide
      projectId,
      interviewId,
    } = await req.json();

    // Log input to Langfuse
    trace?.update({
      input: {
        projectName,
        interviewType,
        currentView,
        chatHistoryLength: chatHistory?.length || 0,
      },
    });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get the appropriate system prompt based on current view and interview type
    let systemPrompt = RESEARCH_STRATEGIST_PROMPT;
    
    if (currentView === 'guide' && researchBrief) {
      // Use Interview Guide Generator prompt (only if research brief exists)
      systemPrompt = INTERVIEW_GUIDE_SYSTEM_PROMPT;
      console.log('📋 Using Interview Guide Generator prompt');
    } else if (interviewType) {
      // Use interview type-specific research brief prompt
      const agent = getAgentByType(interviewType);
      if (agent) {
        systemPrompt = agent.getSystemPrompt();
        console.log(`🎯 Using ${interviewType} agent prompt`);
      }
    }
    
    // Safety check: if currentView is 'guide' but no research brief exists, log warning
    if (currentView === 'guide' && !researchBrief) {
      console.warn('⚠️  currentView is "guide" but no research brief provided - falling back to brief generation');
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: `Project: ${projectName}${projectDescription ? `\nDescription: ${projectDescription}` : ''}`,
      },
      ...chatHistory
        .filter((msg: ChatMessage) => msg.content && msg.content.trim().length > 0)
        .map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content,
        })),
    ];

    // Add context based on current view
    if (currentView === 'guide' && researchBrief) {
      // When generating interview guide, provide the research brief as context
      messages.push({
        role: 'system' as const,
        content: `[Research Brief to Transform]:

${researchBrief}

[End of Research Brief]

Transform this research brief into a stakeholder-ready interview guide using the structure defined in your system prompt.`,
      });
    } else if (currentBriefVersion && currentBriefVersion > 0) {
      // When refining research brief, add version context
      messages.push({
        role: 'system' as const,
        content: `[Context: A research brief already exists at version ${currentBriefVersion}. If the user requests changes or refinements, you should generate version ${currentBriefVersion + 1}. The version number in the generate_research_brief function should be ${currentBriefVersion + 1}.]`,
      });
    }

    // If product context is provided from URL scraping, add it to the context
    if (productContext) {
      const contextMessage = `[System Note: I analyzed the URL provided and found the following product information:
Product: ${productContext.title || 'Unknown'}
${productContext.description ? `Description: ${productContext.description}` : ''}
${productContext.features?.length > 0 ? `Key Features:\n${productContext.features.map((f: string) => `- ${f}`).join('\n')}` : ''}
${productContext.keywords?.length > 0 ? `Keywords: ${productContext.keywords.join(', ')}` : ''}

You can reference this information in your response to show that you've analyzed their product.]`;
      
      messages.push({
        role: 'system' as const,
        content: contextMessage,
      });
    }

    // Call OpenAI with function calling to extract brief/guide when ready
    const tools = currentView === 'guide' ? [
      // Interview Guide generation tool
      {
        type: 'function' as const,
        function: {
          name: 'generate_interview_guide',
          description: 'Generate a stakeholder-ready interview guide from the research brief. Use this when the user asks to generate the guide or when you have enough information to transform the brief.',
          parameters: {
            type: 'object',
            properties: {
              guide_content: {
                type: 'string',
                description: 'The complete interview guide in markdown format with sections: Objective, Learning Goals, Key Questions, Conversation Flow, Success Metrics, Participants, Rules/Guardrails.',
              },
              word_count: {
                type: 'number',
                description: 'Approximate word count of the guide (target: 800-1200 words)',
              },
              version: {
                type: 'number',
                description: 'Version number of this guide (1 for first, increment for refinements)',
              },
            },
            required: ['guide_content', 'word_count', 'version'],
          },
        },
      },
    ] : [
      // Research Brief generation tool
      {
        type: 'function' as const,
        function: {
          name: 'generate_research_brief',
          description: 'Generate a complete research brief when you have gathered enough information or when the user explicitly requests it. Use this when you are confident you can create a comprehensive brief.',
          parameters: {
            type: 'object',
            properties: {
              brief_content: {
                type: 'string',
                description: 'The complete research brief in markdown format, following the agent\'s template structure.',
              },
              sections_with_user_input: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of section IDs that have explicit user input (not agent recommendations)',
              },
              sections_with_recommendations: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of section IDs where agent filled in recommendations due to missing user input',
              },
              version: {
                type: 'number',
                description: 'Version number of this brief (1 for first, increment for refinements)',
              },
            },
            required: ['brief_content', 'sections_with_user_input', 'sections_with_recommendations', 'version'],
          },
        },
      },
    ];

    // Create Langfuse generation span
    const generation = trace?.generation({
      name: currentView === 'guide' ? 'interview-guide-generation' : 'research-brief-generation',
      model: 'gpt-4.1',
      modelParameters: {
        temperature: 0.3,
        max_tokens: 4000, // Increased for comprehensive briefs
      },
      input: messages,
      metadata: {
        interviewType,
        currentView,
        hasTools: tools.length > 0,
        toolChoice: 'auto',
      },
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages,
      max_tokens: 4000, // Increased for comprehensive briefs
      temperature: 0.3,
      tools,
      tool_choice: 'auto', // Let the agent decide when to generate the brief
    });

    const responseMessage = completion.choices[0]?.message;

    // Update Langfuse generation with response
    generation?.end({
      output: responseMessage,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    });

    if (!responseMessage) {
      throw new Error('No response from OpenAI');
    }

    let assistantMessage = responseMessage.content || '';
    let researchBriefOutput = '';
    let interviewGuideOutput = '';
    let briefMetadata = null;
    let guideMetadata = null;

    // Check if the agent used a function to generate content
    console.log('🔍 Checking for tool calls...');
    console.log('   Has tool_calls:', !!responseMessage.tool_calls);
    console.log('   Tool calls count:', responseMessage.tool_calls?.length || 0);
    console.log('   Assistant message:', assistantMessage?.substring(0, 100));
    
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0] as any;
      console.log('   Tool call name:', toolCall?.function?.name);
      
      if (toolCall?.function?.name === 'generate_research_brief') {
        try {
          const functionArgs = JSON.parse(toolCall.function?.arguments ?? '{}');
          researchBriefOutput = functionArgs.brief_content;
          briefMetadata = {
            sections_with_user_input: functionArgs.sections_with_user_input,
            sections_with_recommendations: functionArgs.sections_with_recommendations,
            version: functionArgs.version,
            generated_at: new Date().toISOString(),
          };
          
          console.log('📝 Research Brief generated via function call');
          console.log('   Version:', functionArgs.version);
          console.log('   User input sections:', functionArgs.sections_with_user_input.length);
          console.log('   Agent recommendations:', functionArgs.sections_with_recommendations.length);
          
          if (!assistantMessage || assistantMessage.trim() === '') {
            assistantMessage = "I've generated a comprehensive research brief based on our conversation. You can review it in the panel on the right. Feel free to ask for any refinements!";
          }
        } catch (error) {
          console.error('Error parsing brief function call:', error);
        }
      } else if (toolCall?.function?.name === 'generate_interview_guide') {
        try {
          const functionArgs = JSON.parse(toolCall.function?.arguments ?? '{}');
          interviewGuideOutput = functionArgs.guide_content;
          guideMetadata = {
            word_count: functionArgs.word_count,
            version: functionArgs.version,
            generated_at: new Date().toISOString(),
          };
          
          console.log('📋 Interview Guide generated via function call');
          console.log('   Version:', functionArgs.version);
          console.log('   Word count:', functionArgs.word_count);
          
          if (!assistantMessage || assistantMessage.trim() === '') {
            assistantMessage = "I've generated your interview guide! You can review it in the panel on the right. This is a stakeholder-ready document that you can refine or approve to proceed.";
          }
        } catch (error) {
          console.error('Error parsing guide function call:', error);
        }
      }
    }

    // Persist the research brief to Supabase if generated
    if (researchBriefOutput) {
      try {
        const insertData: any = {
          content: researchBriefOutput,
          version: briefMetadata?.version || 1,
        };
        let resolvedProjectId = projectId || null;

        if (!resolvedProjectId && projectName) {
          const { data: proj } = await supabaseService()
            .from('projects')
            .select('id')
            .ilike('name', projectName)
            .limit(1)
            .maybeSingle();

          if (proj && (proj as any).id) {
            resolvedProjectId = (proj as any).id as string;
          }
        }

        if (resolvedProjectId) {
          insertData.project_id = resolvedProjectId;
        }

        if (interviewId) {
          insertData.interview_id = interviewId;
        }

        await supabaseService().from('research_briefs').insert(insertData);
        console.log('✅ Research brief persisted to Supabase (best-effort)');
      } catch (err) {
        console.warn('Failed to persist research brief to Supabase:', err);
      }
    }

    // Update trace with final output
    trace?.update({
      output: {
        hasResearchBrief: !!researchBriefOutput,
        hasInterviewGuide: !!interviewGuideOutput,
        briefLength: researchBriefOutput?.length || 0,
        guideLength: interviewGuideOutput?.length || 0,
        briefVersion: briefMetadata?.version,
        guideVersion: guideMetadata?.version,
      },
      metadata: {
        success: true,
        functionCalled: !!(researchBriefOutput || interviewGuideOutput),
      },
    });

    // Flush Langfuse events before returning
    await flushLangfuse();

    console.log('📤 Returning response:');
    console.log('   Message:', assistantMessage?.substring(0, 100));
    console.log('   Research Brief length:', researchBriefOutput?.length || 0);
    console.log('   Interview Guide length:', interviewGuideOutput?.length || 0);
    console.log('   Brief metadata:', briefMetadata ? 'present' : 'null');

    return NextResponse.json({
      message: assistantMessage,
      researchBrief: researchBriefOutput,
      interviewGuide: interviewGuideOutput,
      briefMetadata,
      guideMetadata,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Log error to Langfuse
    trace?.update({
      output: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        success: false,
      },
    });
    
    await flushLangfuse();
    
    return NextResponse.json(
      { 
        error: 'Failed to process chat message', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
