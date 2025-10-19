/**
 * Test Interview Config API
 * Generates a temporary Hume EVI config for testing the interview
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateHumePromptWithAgent } from '@/lib/agents';
import { createHumeConfigWithPrompt } from '@/lib/hume/config-builder';
import { ResearchBrief } from '@/lib/interview-types/types';
import { parseInterviewGuide } from '@/lib/interview-types/utils/guide-parser';

/**
 * Extract clean product description from brief for conversation context
 * Returns a single-line, plain text description without markdown
 */
function extractCleanProductContext(brief: ResearchBrief): string {
  const objective = brief.objective || '';
  
  // If objective is too long (contains markdown), try to extract just the product description
  if (objective.length > 200 || objective.includes('**') || objective.includes('-')) {
    // Try to extract "Product/Feature Being Tested" line
    const productMatch = objective.match(/\*\*Product\/Feature Being Tested\*\*[:\s]*([^-\n*]+)/i);
    if (productMatch) {
      return productMatch[1].trim();
    }
    
    // Try to extract first meaningful sentence
    const sentences = objective.split(/[.!?]\s+/);
    if (sentences.length > 0 && sentences[0].length < 150) {
      return sentences[0].trim();
    }
    
    // Fall back to truncated version
    return objective.substring(0, 100).trim() + '...';
  }
  
  // Objective is already clean
  return objective.trim();
}

/**
 * Parse markdown research brief into ResearchBrief object
 */
function parseResearchBriefMarkdown(markdown: string): ResearchBrief {
  const sections = markdown.split('\n\n');
  
  // Extract objective
  const objectiveMatch = markdown.match(/\*\*Objective\*\*\s*\n-\s*(.+)/);
  const objective = objectiveMatch ? objectiveMatch[1].trim() : 'Conduct product feedback research';
  
  // Extract learning goals
  const learningGoalsSection = markdown.match(/\*\*Learning Goals\*\*\s*\n((?:[-\d].+\n?)+)/);
  const learningGoals: string[] = [];
  if (learningGoalsSection) {
    const goals = learningGoalsSection[1].match(/[-\d]\.\s*(.+)/g);
    if (goals) {
      learningGoals.push(...goals.map(g => g.replace(/^[-\d]\.\s*/, '').trim()));
    }
  }
  
  // Extract key questions
  const keyQuestionsSection = markdown.match(/\*\*Key Questions\*\*\s*\n((?:[-\d].+\n?)+)/);
  const keyQuestions: string[] = [];
  if (keyQuestionsSection) {
    const questions = keyQuestionsSection[1].match(/[-\d]\.\s*(.+)/g);
    if (questions) {
      keyQuestions.push(...questions.map(q => q.replace(/^[-\d]\.\s*/, '').trim()));
    }
  }
  
  // Extract conversation flow sections
  const flowSections = markdown.match(/\*\*([^*]+)\*\*\s*\n-\s*(.+?)(?=\n\*\*|\n\n|$)/g);
  const conversationFlow = [];
  if (flowSections) {
    for (const section of flowSections) {
      const match = section.match(/\*\*([^*]+)\*\*\s*\n-\s*(.+)/);
      if (match) {
        conversationFlow.push({
          phase: match[1].trim(),
          focus: match[2].trim(),
          keyTopics: [],
        });
      }
    }
  }
  
  return {
    objective,
    learningGoals: learningGoals.length > 0 ? learningGoals : ['Understand user experience', 'Identify pain points', 'Gather feature requests'],
    keyQuestions: keyQuestions.length > 0 ? keyQuestions : ['What is your experience with the product?', 'What would you improve?'],
    conversationFlow: conversationFlow.length > 0 ? conversationFlow : [
      { phase: 'Introduction', focus: 'Build rapport', keyTopics: [] },
      { phase: 'Experience', focus: 'Understand usage', keyTopics: [] },
      { phase: 'Feedback', focus: 'Gather insights', keyTopics: [] },
    ],
    generatedAt: new Date(),
    generatedBy: 'test-config-api',
  };
}

export async function POST(req: NextRequest) {
  try {
    const { researchBrief, interviewType, interviewName } = await req.json();

    if (!researchBrief) {
      return NextResponse.json(
        { error: 'Research brief is required' },
        { status: 400 }
      );
    }

    // Handle multiple formats: string (markdown brief or interview guide), or object (JSONB from database)
    let briefObject: ResearchBrief;
    
    if (typeof researchBrief === 'string') {
      // Detect if this is an interview guide (Usability Testing) or a research brief
      const isInterviewGuide = 
        researchBrief.includes('## 1. Project Overview') || 
        researchBrief.includes('## 2. Research Objectives') ||
        researchBrief.includes('## Objective');
      
      if (isInterviewGuide) {
        // It's an interview guide - use the specialized parser
        console.log('🔍 [test-config] Detected interview guide format, using parseInterviewGuide()');
        briefObject = parseInterviewGuide(researchBrief);
      } else {
        // It's a standard research brief - use the basic markdown parser
        console.log('🔍 [test-config] Detected research brief format, using parseResearchBriefMarkdown()');
        briefObject = parseResearchBriefMarkdown(researchBrief);
      }
    } else if (typeof researchBrief === 'object') {
      // Already a structured object from database
      console.log('🔍 [test-config] Received structured object (JSONB from database)');
      briefObject = researchBrief as ResearchBrief;
    } else {
      return NextResponse.json(
        { error: 'Invalid research brief format' },
        { status: 400 }
      );
    }

    // 🔍 DIAGNOSTIC: Log brief object structure
    console.log('🔍 [test-config] Interview Type:', interviewType);
    console.log('🔍 [test-config] Brief Object Keys:', Object.keys(briefObject));
    console.log('🔍 [test-config] Brief Object:', JSON.stringify(briefObject, null, 2));

    // Generate Hume-optimized system prompt from research brief
    const humePrompt = generateHumePromptWithAgent(
      interviewType || 'custom',
      briefObject
    );

    // 🔍 DIAGNOSTIC: Log generated prompt
    console.log('🔍 [test-config] Hume Prompt Length:', humePrompt.length);
    console.log('🔍 [test-config] Hume Prompt Preview (first 500 chars):', humePrompt.substring(0, 500));
    console.log('🔍 [test-config] Hume Prompt Preview (last 500 chars):', humePrompt.substring(Math.max(0, humePrompt.length - 500)));

    // Create a test Hume config
    const configName = `TEST: ${interviewName || 'Interview Test'}`;
    
    // Simple, warm greeting - AI will introduce context after user responds
    const naturalGreeting = `Hi there, I'm Amy! Thanks for taking the time to chat with us today. How's your day been so far?`;
    
    const { configId, promptId } = await createHumeConfigWithPrompt(
      humePrompt,
      {
        name: configName,
        voice: {
          provider: 'HUME_AI',
          name: 'Sitcom Girl', // Actual Hume AI voice ID (display as "Amy" in UI)
        },
        languageModel: {
          model_provider: 'OPEN_AI',
          model_resource: 'gpt-4.1',
          temperature: 0.5,
        },
        enableOnNewChat: true,
        onNewChatMessage: naturalGreeting,
      }
    );

    // 🔍 DIAGNOSTIC: Log Hume config response
    console.log('🔍 [test-config] Hume Config Created:', {
      configId,
      promptId,
      configName,
      greeting: naturalGreeting,
    });

    // Get access token for this test session
    const { fetchAccessToken } = await import('hume');
    const tokenResponse = await fetchAccessToken({
      apiKey: process.env.HUME_API_KEY!,
      secretKey: process.env.HUME_SECRET_KEY!,
    });

    // Extract the actual token string (fetchAccessToken returns an object)
    const accessToken = typeof tokenResponse === 'string' 
      ? tokenResponse 
      : (tokenResponse as any)?.access_token || String(tokenResponse);

    console.log('✅ Access token type:', typeof accessToken);
    console.log('✅ Access token preview:', accessToken?.substring(0, 20) + '...');

    return NextResponse.json({
      success: true,
      configId,
      promptId,
      accessToken,
      humePrompt: humePrompt.substring(0, 500) + '...', // Preview only
    });

  } catch (error) {
    console.error('❌ Error creating test config:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
    
    return NextResponse.json(
      {
        error: 'Failed to create test config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
