/**
 * Interview Guide Parser
 * Converts Interview Guide (markdown) to structured ResearchBrief object
 * 
 * This enables the Interview Guide to be fed into the existing
 * generateHumePrompt() pipeline.
 */

import { ResearchBrief, ConversationStructure } from '../types';

/**
 * Parse Interview Guide markdown into ResearchBrief structure
 */
export function parseInterviewGuide(guideMarkdown: string): ResearchBrief {
  if (!guideMarkdown || guideMarkdown.trim() === '') {
    throw new Error('Interview Guide is empty or invalid');
  }

  const sections = splitIntoSections(guideMarkdown);

  return {
    objective: extractObjective(sections),
    learningGoals: extractLearningGoals(sections),
    keyQuestions: extractKeyQuestions(sections),
    conversationFlow: extractConversationFlow(sections),
    additionalSections: {
      successMetrics: extractSuccessMetrics(sections),
      participants: extractParticipants(sections),
      guardrails: extractGuardrails(sections),
    },
    generatedAt: new Date(),
    generatedBy: 'interview-guide-parser',
  };
}

/**
 * Split markdown into sections by ## headers
 */
function splitIntoSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split('\n');
  
  let currentSection = '';
  let currentContent: string[] = [];

  console.log('🔍 [guide-parser] Parsing interview guide markdown...');
  console.log('🔍 [guide-parser] First 500 chars:', markdown.substring(0, 500));

  for (const line of lines) {
    // Check if this is a section header (## N. SECTION_NAME)
    const headerMatch = line.match(/^##\s+\d+\.\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.set(currentSection, currentContent.join('\n').trim());
        console.log(`🔍 [guide-parser] Saved section: "${currentSection}" (${currentContent.length} lines)`);
      }
      
      // Start new section
      currentSection = headerMatch[1].trim().toUpperCase();
      currentContent = [];
      console.log(`🔍 [guide-parser] Found section header: "${currentSection}"`);
    } else {
      // Add line to current section
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections.set(currentSection, currentContent.join('\n').trim());
    console.log(`🔍 [guide-parser] Saved final section: "${currentSection}" (${currentContent.length} lines)`);
  }

  console.log('🔍 [guide-parser] Total sections found:', Array.from(sections.keys()));

  return sections;
}

/**
 * Extract OBJECTIVE section
 * Maps to: "PROJECT OVERVIEW" or "RESEARCH OBJECTIVES" sections
 * Returns a clean, single-line product description
 */
function extractObjective(sections: Map<string, string>): string {
  // Try multiple section names that could contain the objective
  const content = sections.get('OBJECTIVE') || 
                  sections.get('PROJECT OVERVIEW') || 
                  sections.get('RESEARCH OBJECTIVES') || 
                  '';
  
  if (!content) {
    console.error('🔍 [guide-parser] Available sections:', Array.from(sections.keys()));
    throw new Error('OBJECTIVE section is required in Interview Guide');
  }

  // Try to extract just the "Product/Feature Being Tested" line
  const productMatch = content.match(/\*\*Product\/Feature Being Tested\*\*[:\s]*([^\n*]+)/i);
  if (productMatch) {
    // Clean up the description: remove markdown, quotes, and extra formatting
    return productMatch[1]
      .replace(/[*_`]/g, '') // Remove markdown formatting
      .replace(/^[""]|[""]$/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  // Fallback: Try to extract "Brief Context" line
  const contextMatch = content.match(/\*\*Brief Context\*\*[:\s]*([^\n*]+)/i);
  if (contextMatch) {
    return contextMatch[1]
      .replace(/[*_`]/g, '')
      .replace(/^[""]|[""]$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Last resort: Take first meaningful line (not a header)
  const lines = content.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && 
           !trimmed.startsWith('**') && 
           !trimmed.startsWith('-') &&
           !trimmed.startsWith('•');
  });
  
  if (lines.length > 0) {
    return lines[0].replace(/\s+/g, ' ').trim();
  }
  
  // Ultimate fallback: just return cleaned content
  return content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);
}

/**
 * Extract LEARNING GOALS section
 * Maps to: "LEARNING GOALS" or "RESEARCH OBJECTIVES"
 */
function extractLearningGoals(sections: Map<string, string>): string[] {
  const content = sections.get('LEARNING GOALS') || 
                  sections.get('RESEARCH OBJECTIVES') || 
                  '';
  
  if (!content) {
    return [];
  }

  return extractBulletList(content);
}

/**
 * Extract KEY QUESTIONS section
 * Maps to: "KEY QUESTIONS" or "TASKS & SCENARIOS"
 */
function extractKeyQuestions(sections: Map<string, string>): string[] {
  const content = sections.get('KEY QUESTIONS') || 
                  sections.get('TASKS & SCENARIOS') || 
                  '';
  
  if (!content) {
    return [];
  }

  return extractBulletList(content);
}

/**
 * Extract CONVERSATION FLOW section
 * Maps to: "CONVERSATION FLOW" or "METHODOLOGY"
 */
function extractConversationFlow(sections: Map<string, string>): ConversationStructure[] {
  const content = sections.get('CONVERSATION FLOW') || 
                  sections.get('METHODOLOGY') || 
                  '';
  
  if (!content) {
    return [];
  }

  const conversationFlow: ConversationStructure[] = [];
  const lines = content.split('\n');
  
  let currentPhase: ConversationStructure | null = null;
  let skipNote = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip the initial note about sample questions
    if (trimmed.toLowerCase().includes('sample questions guide the conversation')) {
      skipNote = true;
      continue;
    }
    if (skipNote && trimmed === '') {
      skipNote = false;
      continue;
    }
    if (skipNote) continue;

    // Check for phase header (e.g., **Phase Name** or **Phase Name (High Emphasis)**)
    const phaseMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    
    if (phaseMatch) {
      // Save previous phase if exists
      if (currentPhase) {
        conversationFlow.push(currentPhase);
      }
      
      // Extract phase name and emphasis
      let phaseName = phaseMatch[1].trim();
      const emphasisMatch = phaseName.match(/^(.+?)\s*\((.+?)\)$/);
      
      if (emphasisMatch) {
        phaseName = emphasisMatch[1].trim();
        // Could store emphasis level in future if needed
      }
      
      // Start new phase
      currentPhase = {
        phase: phaseName,
        focus: '', // Will be filled from content
        keyTopics: [],
      };
    } else if (currentPhase && trimmed.startsWith('Sample Questions')) {
      // Skip this header, topics will follow
      continue;
    } else if (currentPhase && (trimmed.startsWith('•') || trimmed.startsWith('-'))) {
      // Extract topic from bullet point
      const topic = trimmed.replace(/^[•\-]\s*/, '').trim();
      
      // Remove quotes if present (sample questions are quoted)
      const cleanTopic = topic.replace(/^[""](.+)[""]$/, '$1');
      
      // First bullet after phase name is often the focus
      if (!currentPhase.focus && !cleanTopic.toLowerCase().includes('dimensions:')) {
        currentPhase.focus = cleanTopic;
      } else if (!cleanTopic.toLowerCase().includes('dimensions:')) {
        currentPhase.keyTopics?.push(cleanTopic);
      }
    } else if (currentPhase && trimmed && !trimmed.includes(':')) {
      // Regular text line - could be focus description
      if (!currentPhase.focus) {
        currentPhase.focus = trimmed;
      }
    }
  }

  // Save last phase
  if (currentPhase) {
    conversationFlow.push(currentPhase);
  }

  return conversationFlow;
}

/**
 * Extract SUCCESS METRICS section
 */
function extractSuccessMetrics(sections: Map<string, string>): string[] {
  const content = sections.get('SUCCESS METRICS') || '';
  
  if (!content) {
    return [];
  }

  return extractBulletList(content);
}

/**
 * Extract PARTICIPANTS section
 */
function extractParticipants(sections: Map<string, string>): Record<string, any> {
  const content = sections.get('PARTICIPANTS') || '';
  
  if (!content) {
    return {};
  }

  const participants: Record<string, any> = {};
  const bullets = extractBulletList(content);

  // Try to parse common participant fields
  for (const bullet of bullets) {
    if (bullet.toLowerCase().includes('target') || bullet.toLowerCase().includes('profile')) {
      participants.targetAudience = bullet;
    } else if (bullet.toLowerCase().includes('sample size')) {
      // Extract number if present
      const numberMatch = bullet.match(/(\d+)/);
      if (numberMatch) {
        participants.sampleSize = parseInt(numberMatch[1], 10);
      }
      participants.sampleSizeRationale = bullet;
    } else if (bullet.toLowerCase().includes('screening')) {
      if (!participants.screeningCriteria) {
        participants.screeningCriteria = [];
      }
      participants.screeningCriteria.push(bullet);
    } else {
      // Generic participant info
      if (!participants.additionalInfo) {
        participants.additionalInfo = [];
      }
      participants.additionalInfo.push(bullet);
    }
  }

  return participants;
}

/**
 * Extract RULES / GUARDRAILS section
 */
function extractGuardrails(sections: Map<string, string>): string[] {
  const content = sections.get('RULES / GUARDRAILS') || 
                  sections.get('RULES') || 
                  sections.get('GUARDRAILS') || '';
  
  if (!content) {
    return [];
  }

  return extractBulletList(content);
}

/**
 * Helper: Extract bullet list from content
 */
function extractBulletList(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match bullet points: •, -, or numbered lists
    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    
    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
    } else if (numberedMatch) {
      items.push(numberedMatch[1].trim());
    }
  }

  return items;
}

/**
 * Validate parsed ResearchBrief
 */
export function validateResearchBrief(brief: ResearchBrief): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!brief.objective || brief.objective.trim() === '') {
    errors.push('Objective is required');
  }

  if (!brief.learningGoals || brief.learningGoals.length === 0) {
    warnings.push('No learning goals found');
  }

  if (!brief.keyQuestions || brief.keyQuestions.length === 0) {
    warnings.push('No key questions found');
  }

  if (!brief.conversationFlow || brief.conversationFlow.length === 0) {
    warnings.push('No conversation flow found');
  }

  // Check quality
  if (brief.learningGoals && brief.learningGoals.length < 3) {
    warnings.push('Less than 3 learning goals - brief may be incomplete');
  }

  if (brief.keyQuestions && brief.keyQuestions.length < 5) {
    warnings.push('Less than 5 key questions - brief may be incomplete');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

