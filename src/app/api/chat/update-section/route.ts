import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAgentByType } from "@/lib/interview-types/registry";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UpdateSectionRequest {
  sectionId: string;
  sectionContent: string;
  fullBrief: string;
  interviewType: string;
  projectName: string;
}

/**
 * API endpoint to update a specific section of the research brief
 * Regenerates affected sections while maintaining consistency
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      sectionId, 
      sectionContent, 
      fullBrief, 
      interviewType,
      projectName,
    }: UpdateSectionRequest = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get agent for interview type
    const agent = getAgentByType(interviewType);
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid interview type' },
        { status: 400 }
      );
    }

    // Create a prompt for updating the section
    const updatePrompt = `You are updating a specific section of a research brief. 

PROJECT: ${projectName}
INTERVIEW TYPE: ${interviewType}

ORIGINAL FULL BRIEF:
${fullBrief}

SECTION TO UPDATE: ${sectionId}

UPDATED SECTION CONTENT:
${sectionContent}

TASK:
1. Review the updated section content
2. Identify if any OTHER sections need to be updated to maintain consistency
3. Return the complete updated brief with all necessary changes

For example:
- If "Research Objectives" changed, "Tasks & Scenarios" might need updates
- If "Participants" changed, screening criteria in "Methodology" might need updates
- If "Timeline" changed, "Logistics" might need updates

Return the COMPLETE updated brief in the same markdown format, ensuring all sections are consistent with the change.`;

    const messages = [
      {
        role: 'system' as const,
        content: agent.getSystemPrompt(),
      },
      {
        role: 'user' as const,
        content: updatePrompt,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages,
      max_tokens: 4000,
      temperature: 0.3,
    });

    const updatedBrief = completion.choices[0]?.message?.content || '';

    // Parse the updated brief to identify which sections changed
    const changedSections = identifyChangedSections(fullBrief, updatedBrief);

    return NextResponse.json({
      updatedBrief,
      changedSections,
      message: `Updated ${sectionId} and ${changedSections.length - 1} related section(s)`,
    });

  } catch (error) {
    console.error('Section update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update section',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Compare two briefs and identify which sections changed
 */
function identifyChangedSections(originalBrief: string, updatedBrief: string): string[] {
  const originalSections = parseBriefSections(originalBrief);
  const updatedSections = parseBriefSections(updatedBrief);
  
  const changed: string[] = [];
  
  for (const [id, updatedContent] of Object.entries(updatedSections)) {
    const originalContent = originalSections[id];
    if (!originalContent || originalContent !== updatedContent) {
      changed.push(id);
    }
  }
  
  return changed;
}

/**
 * Parse brief into sections
 */
function parseBriefSections(brief: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = brief.split('\n');
  
  let currentSectionId: string | null = null;
  let currentSectionContent: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ') || (trimmed.startsWith('# ') && !trimmed.startsWith('##'))) {
      // Save previous section
      if (currentSectionId) {
        sections[currentSectionId] = currentSectionContent.join('\n');
      }
      
      // Start new section
      const title = trimmed.startsWith('## ') ? trimmed.substring(3) : trimmed.substring(2);
      currentSectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      currentSectionContent = [line];
    } else if (currentSectionId) {
      currentSectionContent.push(line);
    }
  }
  
  // Save final section
  if (currentSectionId) {
    sections[currentSectionId] = currentSectionContent.join('\n');
  }
  
  return sections;
}

