/**
 * Interview Guide Parser
 * Extracts structured interview guide from markdown content
 */

import { InterviewGuide } from './types';

/**
 * Parse interview guide markdown into structured format
 */
export function parseInterviewGuide(guideContent: string, estimatedDuration: number = 15): InterviewGuide {
  const questions: InterviewGuide['questions'] = [];
  const lines = guideContent.split('\n');

  let currentSection = '';
  let currentObjective = '';
  let questionCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Track section headers (## or ###)
    if (line.startsWith('##')) {
      currentSection = line.replace(/^#+\s*/, '').trim();
      
      // Try to infer objective from section name
      if (currentSection.toLowerCase().includes('objective')) {
        // Next line might be the objective
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('-')) {
            currentObjective = nextLine.replace(/^[•\-*]\s*/, '');
          }
        }
      }
      continue;
    }

    // Detect questions (lines starting with - or • or numbers)
    const questionMatch = line.match(/^[\-•*]\s*(.+)$/) || line.match(/^\d+\.\s*(.+)$/);
    
    if (questionMatch) {
      const questionText = questionMatch[1].trim();
      
      // Filter out non-question content (headers, notes, etc.)
      if (
        questionText.length < 10 || // Too short to be a real question
        questionText.match(/^\*\*.*:\*\*$/) || // Bold headers like **Opening:**
        !questionText.match(/[a-z]/) // No lowercase letters (likely a heading)
      ) {
        continue;
      }

      questionCounter++;
      
      // Determine question type
      let type: 'open' | 'closed' | 'probe' = 'open';
      
      if (
        questionText.toLowerCase().includes('tell me more') ||
        questionText.toLowerCase().includes('can you elaborate') ||
        questionText.toLowerCase().includes('why') ||
        questionText.toLowerCase().includes('how')
      ) {
        if (questionText.length < 50 && questionText.toLowerCase().includes('tell me')) {
          type = 'probe';
        } else {
          type = 'open';
        }
      } else if (
        questionText.toLowerCase().includes('yes or no') ||
        questionText.toLowerCase().includes('have you') ||
        questionText.toLowerCase().includes('do you') ||
        questionText.toLowerCase().includes('are you') ||
        questionText.toLowerCase().includes('would you')
      ) {
        // Could be closed, but treat as open if it's long
        type = questionText.length > 100 ? 'open' : 'closed';
      }

      questions.push({
        id: `q${questionCounter}`,
        question: questionText,
        type,
        objective: currentObjective || currentSection || undefined,
        expectedDuration: type === 'probe' ? 30 : 60 // seconds
      });
    }
  }

  // If no questions found, create a basic one
  if (questions.length === 0) {
    questions.push({
      id: 'q1',
      question: 'Can you tell me about your experience?',
      type: 'open',
      expectedDuration: 60
    });
  }

  return {
    questions,
    estimatedDuration
  };
}

/**
 * Extract project objectives from brief content
 */
export function extractObjectives(briefContent: string): string[] {
  const objectives: string[] = [];
  const lines = briefContent.split('\n');

  let inObjectiveSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Look for objective sections
    if (
      trimmed.toLowerCase().includes('objective') ||
      trimmed.toLowerCase().includes('goal') ||
      trimmed.toLowerCase().includes('aim')
    ) {
      inObjectiveSection = true;
      continue;
    }

    // Exit objective section on new major heading
    if (trimmed.startsWith('##') && !trimmed.toLowerCase().includes('objective')) {
      inObjectiveSection = false;
      continue;
    }

    // Extract objectives (bullet points in objective section)
    if (inObjectiveSection) {
      const objectiveMatch = trimmed.match(/^[\-•*]\s*(.+)$/);
      if (objectiveMatch) {
        const objective = objectiveMatch[1]
          .replace(/\*\*/g, '') // Remove bold markers
          .trim();
        
        if (objective.length > 10) {
          objectives.push(objective);
        }
      }
    }
  }

  // Fallback: if no objectives found, extract from first few lines
  if (objectives.length === 0) {
    objectives.push('Understand user experience and gather insights');
  }

  return objectives;
}

