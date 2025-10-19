import OpenAI from 'openai';
import {
  ASSISTANT_ANALYSIS_PROMPT,
  AssistantAnalysisInput,
  AssistantAnalysisOutput
} from '@/lib/agents/assistant-agent';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Perform assistant analysis directly (without HTTP call)
 * This prevents localhost connection issues in Vercel
 */
export async function performAssistantAnalysis(input: AssistantAnalysisInput): Promise<AssistantAnalysisOutput> {
  try {
    const {
      userPrompt,
      generatedContent,
      contentType,
      interviewType,
      metadata
    } = input;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (!userPrompt || !generatedContent) {
      throw new Error('Missing required fields: userPrompt and generatedContent');
    }

    console.log('🔍 [Assistant Analysis] Analyzing generated content:', {
      contentType,
      interviewType,
      userPromptLength: userPrompt.length,
      contentLength: generatedContent.length,
      metadata,
    });

    // Prepare context for analysis
    const analysisContext = `
## User's Original Request:
${userPrompt}

## Interview Type:
${interviewType || 'custom'}

## Content Type:
${contentType === 'guide' ? 'Interview Guide' : 'Research Brief'}

${metadata ? `
## Metadata:
- Sections: ${metadata.sectionCount || 'unknown'}
- Participants: ${metadata.participantCount || 'unknown'}
- Duration: ${metadata.duration || 'unknown'} minutes
${metadata.dimensions ? `- Dimensions: ${metadata.dimensions}` : ''}
` : ''}

## Generated ${contentType === 'guide' ? 'Interview Guide' : 'Research Brief'}:
${generatedContent}

---

Please analyze this ${contentType} and provide your insights using the structured format.
`;

    // Call OpenAI for analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Fast and cost-effective for analysis
      messages: [
        {
          role: 'system',
          content: ASSISTANT_ANALYSIS_PROMPT,
        },
        {
          role: 'user',
          content: analysisContext,
        },
      ],
      temperature: 0.7, // Slightly creative for suggestions
      max_tokens: 250, // Ultra-concise: ~50-75 words total
    });

    const intelligentMessage = completion.choices[0]?.message?.content || '';

    console.log('✅ [Assistant Analysis] Analysis completed:', {
      messageLength: intelligentMessage.length,
      hasAssumptions: intelligentMessage.includes('💡'),
      hasConsiderations: intelligentMessage.includes('⚠️'),
      hasSuggestions: intelligentMessage.includes('🎯'),
      hasQuestions: intelligentMessage.includes('❓'),
    });

    // Parse suggestions for structured access (optional enhancement)
    const suggestions = parseSuggestions(intelligentMessage);

    const output: AssistantAnalysisOutput = {
      intelligentMessage,
      suggestions,
    };

    return output;

  } catch (error) {
    console.error('❌ [Assistant Analysis] Error:', error);

    // Fallback to generic message if analysis fails
    const fallbackMessage = generateFallbackMessage(input.contentType);

    return {
      intelligentMessage: fallbackMessage,
      suggestions: [],
    };
  }
}

/**
 * Parse structured suggestions from the intelligent message
 */
function parseSuggestions(message: string): Array<{
  type: 'improvement' | 'warning' | 'question';
  message: string;
  section?: string;
}> {
  const suggestions: Array<{
    type: 'improvement' | 'warning' | 'question';
    message: string;
    section?: string;
  }> = [];

  // Parse Quick Wins (improvements)
  const quickWinsMatch = message.match(/🎯 \*\*Quick Wins:\*\*([\s\S]*?)(?=❓|\n\n|$)/);
  if (quickWinsMatch) {
    const bullets = quickWinsMatch[1].match(/• (.+)/g) || [];
    bullets.forEach(bullet => {
      suggestions.push({
        type: 'improvement',
        message: bullet.replace('• ', '').trim(),
      });
    });
  }

  // Parse Considerations (warnings)
  const considerationsMatch = message.match(/⚠️ \*\*Things to Consider:\*\*([\s\S]*?)(?=🎯|\n\n|$)/);
  if (considerationsMatch) {
    const bullets = considerationsMatch[1].match(/• (.+)/g) || [];
    bullets.forEach(bullet => {
      suggestions.push({
        type: 'warning',
        message: bullet.replace('• ', '').trim(),
      });
    });
  }

  // Parse Questions
  const questionsMatch = message.match(/❓ \*\*Questions for You:\*\*([\s\S]*?)$/);
  if (questionsMatch) {
    const bullets = questionsMatch[1].match(/• (.+)/g) || [];
    bullets.forEach(bullet => {
      suggestions.push({
        type: 'question',
        message: bullet.replace('• ', '').trim(),
      });
    });
  }

  return suggestions;
}

/**
 * Generate fallback message if analysis fails
 */
function generateFallbackMessage(contentType: 'brief' | 'guide'): string {
  if (contentType === 'guide') {
    return `I've created your interview guide based on the research brief.

**What's included:**
- Complete conversation structure with specific questions
- Success metrics for key tasks
- Moderator guidance and probing techniques

**Review the guide on the right →**

Need to adjust anything? You can:
- Click any section to edit directly
- Ask me to modify specific parts
- Request additional questions or scenarios`;
  }

  return `I've generated your research brief.

**What I included:**
- Complete study structure with clear objectives
- Research methodology and approach
- Participant criteria and recruitment plan
- Realistic timeline and deliverables

**Review the brief on the right →**

**Need adjustments?** You can:
- Click any section to edit directly
- Tell me what to change
- Ask questions about any section`;
}