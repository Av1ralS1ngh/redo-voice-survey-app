import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getAgentByType } from "@/lib/interview-types/registry";
import { INTERVIEW_GUIDE_SYSTEM_PROMPT } from "@/lib/interview-types/agents/interview-guide-agent";
import { performAssistantAnalysis } from "@/lib/assistant-analysis";

// Force dynamic rendering and disable buffering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

/**
 * Streaming API endpoint for real-time research brief generation
 * Streams section-by-section updates to the client
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      projectName, 
      projectDescription, 
      chatHistory, 
      productContext, 
      interviewType, 
      currentView,
      researchBrief,
    } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the appropriate system prompt
    let systemPrompt = RESEARCH_STRATEGIST_PROMPT;
    
    if (currentView === 'guide' && researchBrief) {
      systemPrompt = INTERVIEW_GUIDE_SYSTEM_PROMPT;
    } else if (interviewType) {
      const agent = getAgentByType(interviewType);
      if (agent) {
        systemPrompt = agent.getSystemPrompt();
      }
    }

    // Prepare messages
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: `Project: ${projectName}\n${projectDescription ? `Description: ${projectDescription}\n` : ''}${productContext ? `\nProduct Context:\nURL: ${productContext.url}\nTitle: ${productContext.title}\nDescription: ${productContext.description}` : ''}`
      },
      ...chatHistory
        .filter((msg: ChatMessage) => msg.content && msg.content.trim().length > 0)
        .map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content,
        })),
    ];

    if (currentView === 'guide' && researchBrief) {
      messages.push({
        role: 'user' as const,
        content: `Here is the research brief to transform into an interview guide:\n\n${researchBrief}`
      });
    }

    // Define function for structured output
    const tools = currentView === 'guide' ? [
      {
        type: 'function' as const,
        function: {
          name: 'generate_interview_guide',
          description: 'Generate interview guide section by section',
          parameters: {
            type: 'object',
            properties: {
              guide_content: {
                type: 'string',
                description: 'The complete interview guide in markdown format',
              },
              version: {
                type: 'number',
                description: 'Version number',
              },
            },
            required: ['guide_content', 'version'],
          },
        },
      },
    ] : [
      {
        type: 'function' as const,
        function: {
          name: 'generate_research_brief',
          description: 'Generate research brief section by section',
          parameters: {
            type: 'object',
            properties: {
              brief_content: {
                type: 'string',
                description: 'The complete research brief in markdown format',
              },
              sections_with_user_input: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sections with user input',
              },
              sections_with_recommendations: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sections with AI recommendations',
              },
              version: {
                type: 'number',
                description: 'Version number',
              },
            },
            required: ['brief_content', 'sections_with_user_input', 'sections_with_recommendations', 'version'],
          },
        },
      },
    ];

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use streaming with OpenAI
          const completion = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages,
            max_tokens: 4000,
            temperature: 0.3,
            tools,
            tool_choice: 'auto',
            stream: true,
          });

          let accumulatedContent = '';
          let assistantMessage = '';
          let toolCallsBuffer: any = {};
          
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;
            
            // Handle regular message content
            if (delta?.content) {
              assistantMessage += delta.content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'message', 
                  content: delta.content 
                })}\n\n`)
              );
            }
            
            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index;
                if (!toolCallsBuffer[index]) {
                  toolCallsBuffer[index] = {
                    id: toolCall.id || '',
                    type: 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: '',
                    },
                  };
                }
                
                if (toolCall.function?.arguments) {
                  toolCallsBuffer[index].function.arguments += toolCall.function.arguments;
                  
                  // Try to parse and extract sections as they stream
                  try {
                    const parsed = JSON.parse(toolCallsBuffer[index].function.arguments);
                    const content = parsed.brief_content || parsed.guide_content;
                    
                    if (content && content !== accumulatedContent) {
                      // Parse sections from the content
                      const sections = parseSections(content);
                      
                      // Send section updates
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ 
                          type: 'sections', 
                          sections: sections,
                          metadata: {
                            sections_with_user_input: parsed.sections_with_user_input || [],
                            sections_with_recommendations: parsed.sections_with_recommendations || [],
                            version: parsed.version || 1,
                          }
                        })}\n\n`)
                      );
                      
                      accumulatedContent = content;
                    }
                  } catch (e) {
                    // JSON not complete yet, continue streaming
                  }
                }
              }
            }
          }
          
          // Send final complete signal
          const toolCalls = Object.values(toolCallsBuffer);
          if (toolCalls.length > 0) {
            const finalToolCall = toolCalls[0] as any;
            const finalArgs = JSON.parse(finalToolCall.function.arguments);
            const finalContent = finalArgs.guide_content || finalArgs.brief_content;
            
            // Parse final sections with isComplete=true to mark all as complete
            const finalSections = parseSections(finalContent, true);
            
            console.log('✅ [API] Sending FINAL sections update:', {
              sectionCount: finalSections.length,
              sections: finalSections.map(s => ({ id: s.id, title: s.title, status: s.status })),
            });
            
            console.log('💬 [API] Assistant message captured:', {
              hasMessage: !!assistantMessage,
              messageLength: assistantMessage.length,
              messagePreview: assistantMessage.substring(0, 200),
            });
            
            // Generate intelligent analysis message using Assistant Agent
            let finalMessage = assistantMessage;
            if (!finalMessage || finalMessage.trim().length === 0) {
              console.log('🤖 [API] Calling Assistant Analysis Agent...');
              
              try {
                // Extract metadata from content
                const metadata = extractMetadata(finalContent, finalSections, finalArgs);
                
                // Get the original user prompt (last user message in chat history)
                const userPrompt = chatHistory
                  .filter((msg: ChatMessage) => msg.role === 'user')
                  .map((msg: ChatMessage) => msg.content)
                  .join('\n') || `${projectName}${projectDescription ? ': ' + projectDescription : ''}`;
                
                // Call assistant analysis directly (avoids base URL env mismatch)
                const analysis = await performAssistantAnalysis({
                  userPrompt,
                  generatedContent: finalContent,
                  contentType: currentView === 'guide' ? 'guide' : 'brief',
                  interviewType: interviewType || 'custom',
                  metadata,
                });

                finalMessage = analysis.intelligentMessage;
                console.log('✅ [API] Assistant analysis completed:', {
                  messageLength: finalMessage.length,
                  hasSuggestions: analysis.suggestions?.length > 0,
                });
              } catch (analysisError) {
                console.error('⚠️ [API] Assistant analysis failed, using fallback:', analysisError);
                
                // Fallback to generic message
                if (currentView === 'guide') {
                  finalMessage = `I've created your interview guide based on the research brief.

**What's included:**
- Complete conversation structure (${finalSections.length} sections)
- Specific questions tied to your research objectives  
- Success metrics for each key task

**Review the guide on the right →**

Need to adjust anything? Just let me know what to change.`;
                } else {
                  finalMessage = `I've generated your research brief.

**What I included:**
- Complete study structure (${finalSections.length} sections)
- Clear research objectives and methodology
- Participant criteria and recruitment plan
- Realistic tasks and success metrics

**Review the brief on the right →**

**Need adjustments?** You can:
- Click any section in the brief to edit directly
- Tell me what to change (e.g., "change to 8 participants")
- Ask questions about any section`;
                }
              }
            }
            
            // Send final sections update with all marked as complete
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'sections', 
                sections: finalSections,
                metadata: {
                  sections_with_user_input: finalArgs.sections_with_user_input || [],
                  sections_with_recommendations: finalArgs.sections_with_recommendations || [],
                  version: finalArgs.version || 1,
                }
              })}\n\n`)
            );
            
            // Send complete signal
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'complete',
                message: finalMessage,
                [currentView === 'guide' ? 'interviewGuide' : 'researchBrief']: finalContent,
                metadata: {
                  sections_with_user_input: finalArgs.sections_with_user_input || [],
                  sections_with_recommendations: finalArgs.sections_with_recommendations || [],
                  version: finalArgs.version || 1,
                }
              })}\n\n`)
            );
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'complete',
                message: assistantMessage
              })}\n\n`)
            );
          }
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for nginx/proxies
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Extract metadata from generated content for assistant analysis
 */
function extractMetadata(
  content: string, 
  sections: Array<{id: string, title: string, content: string, status: string}>,
  args: any
): {
  sectionCount: number;
  participantCount?: number;
  duration?: number;
  dimensions?: number;
} {
  const metadata: any = {
    sectionCount: sections.length,
  };
  
  // Extract participant count
  const participantMatch = content.match(/(\d+)\s+participants?/i);
  if (participantMatch) {
    metadata.participantCount = parseInt(participantMatch[1]);
  }
  
  // Extract duration
  const durationMatch = content.match(/(\d+)[\s-]*(min|minute|minutes)/i);
  if (durationMatch) {
    metadata.duration = parseInt(durationMatch[1]);
  }
  
  // Extract dimensions count (for customer satisfaction briefs)
  const dimensionsMatch = content.match(/(\d+)\s+(key\s+)?dimensions?/i);
  if (dimensionsMatch) {
    metadata.dimensions = parseInt(dimensionsMatch[1]);
  }
  
  return metadata;
}

/**
 * Parse markdown content into sections
 */
function parseSections(content: string, isComplete: boolean = false): Array<{id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'}> {
  const sections: Array<{id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'}> = [];
  const lines = content.split('\n');
  
  let currentSection: {id: string, title: string, content: string, status: 'complete' | 'generating' | 'pending'} | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers (## or #)
    if (trimmed.startsWith('## ') || (trimmed.startsWith('# ') && !trimmed.startsWith('##'))) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      const title = trimmed.startsWith('## ') ? trimmed.substring(3) : trimmed.substring(2);
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      
      currentSection = {
        id,
        title,
        content: line + '\n',
        status: 'generating'
      };
    } else if (currentSection) {
      // Add to current section
      currentSection.content += line + '\n';
    }
  }
  
  // Add final section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // Mark sections as complete or generating based on isComplete flag
  if (sections.length > 0) {
    if (isComplete) {
      // All sections are complete when generation is done
      for (let i = 0; i < sections.length; i++) {
        sections[i].status = 'complete';
      }
    } else {
      // During streaming: mark all but last as complete, last as generating
      for (let i = 0; i < sections.length - 1; i++) {
        sections[i].status = 'complete';
      }
      sections[sections.length - 1].status = 'generating';
    }
  }
  
  return sections;
}

