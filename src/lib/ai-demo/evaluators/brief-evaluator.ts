/**
 * Brief Quality Evaluator
 * Evaluates the quality of the research brief and interview guide
 */

import { ConversationMessage, BriefMetrics, InterviewGuide, Persona } from '../types';

/**
 * Evaluate the quality of the brief and interview guide
 */
export async function evaluateBriefQuality(
  transcript: ConversationMessage[],
  guide: InterviewGuide,
  briefContent: string,
  projectObjectives: string[],
  persona: Persona
): Promise<BriefMetrics> {
  // 1. Question Clarity
  const questionClarity = evaluateQuestionClarity(transcript, guide, persona);
  const clarityIndex = calculateClarityIndex(questionClarity);

  // 2. Objective Coverage
  const { objectiveCoverage, objectiveBreakdown } = evaluateObjectiveCoverage(
    transcript,
    guide,
    projectObjectives
  );

  // 3. Length Realism
  const lengthRealism = evaluateLengthRealism(transcript, guide);

  return {
    clarityIndex,
    questionClarity,
    objectiveCoverage,
    objectiveBreakdown,
    lengthRealism
  };
}

/**
 * Evaluate clarity of each question based on participant confusion
 */
function evaluateQuestionClarity(
  transcript: ConversationMessage[],
  guide: InterviewGuide,
  persona: Persona
): BriefMetrics['questionClarity'] {
  const questionClarityScores: BriefMetrics['questionClarity'] = [];

  for (const question of guide.questions) {
    if (question.type === 'probe') continue; // Skip probe questions

    // Find instances where this question was asked
    const questionMessages = transcript.filter(
      m => m.role === 'agent' && m.metadata?.questionId === question.id
    );

    if (questionMessages.length === 0) {
      // Question wasn't asked - neutral score
      questionClarityScores.push({
        questionId: question.id,
        question: question.question,
        clarityScore: 5,
        issues: ['Question was not asked during interview'],
        clarificationsNeeded: 0
      });
      continue;
    }

    // Analyze participant responses and agent follow-ups
    let clarityScore = 10; // Start with perfect score
    const issues: string[] = [];
    let clarificationsNeeded = 0;

    for (const questionMsg of questionMessages) {
      const msgIndex = transcript.indexOf(questionMsg);
      if (msgIndex === -1) continue;

      // Check next few messages for signs of confusion
      for (let i = msgIndex + 1; i < Math.min(msgIndex + 4, transcript.length); i++) {
        const msg = transcript[i];
        const content = msg.content.toLowerCase();

        if (msg.role === 'user') {
          // User showing confusion
          if (
            content.includes("i don't understand") ||
            content.includes('what do you mean') ||
            content.includes('can you clarify') ||
            content.includes('confused') ||
            content.includes("i'm not sure what you're asking")
          ) {
            clarityScore -= 3;
            clarificationsNeeded++;
            issues.push('Participant expressed confusion');
          }

          // User answered off-topic (possible misunderstanding)
          if (persona.behaviorModel.comprehension === 'low') {
            // For low-comprehension personas, some off-topic is expected
            // but still indicates question clarity issues
            if (content.length > 100 && !content.includes('yes') && !content.includes('no')) {
              // Long answer that might be off-topic - reduce score slightly
              clarityScore -= 0.5;
            }
          }
        }

        if (msg.role === 'agent') {
          // Agent had to rephrase or clarify
          if (
            content.includes('let me rephrase') ||
            content.includes('in other words') ||
            content.includes('what i mean is') ||
            content.includes('to clarify')
          ) {
            clarityScore -= 2;
            clarificationsNeeded++;
            issues.push('Agent needed to rephrase question');
          }
        }
      }
    }

    // Adjust score based on persona comprehension level
    if (persona.behaviorModel.comprehension === 'low' && clarificationsNeeded > 0) {
      // Low comprehension persona - some confusion expected
      clarityScore += 1; // slight compensation
    } else if (persona.behaviorModel.comprehension === 'high' && clarificationsNeeded > 0) {
      // High comprehension persona confused - major issue
      clarityScore -= 2;
      issues.push('Even high-comprehension participant was confused');
    }

    clarityScore = Math.max(0, Math.min(10, clarityScore));

    // Add specific issue descriptions based on score
    if (clarityScore < 5) {
      issues.push('Major clarity issues - question likely needs rewording');
    } else if (clarityScore < 7) {
      issues.push('Moderate clarity issues - consider simplifying');
    }

    questionClarityScores.push({
      questionId: question.id,
      question: question.question,
      clarityScore: Math.round(clarityScore * 10) / 10,
      issues: issues.length > 0 ? issues : ['No clarity issues detected'],
      clarificationsNeeded
    });
  }

  return questionClarityScores;
}

/**
 * Calculate overall clarity index
 */
function calculateClarityIndex(questionClarity: BriefMetrics['questionClarity']): number {
  if (questionClarity.length === 0) return 5;
  
  const totalScore = questionClarity.reduce((sum, q) => sum + q.clarityScore, 0);
  const average = totalScore / questionClarity.length;
  
  return Math.round(average * 10) / 10;
}

/**
 * Evaluate how well the interview covered project objectives
 */
function evaluateObjectiveCoverage(
  transcript: ConversationMessage[],
  guide: InterviewGuide,
  projectObjectives: string[]
): { objectiveCoverage: number; objectiveBreakdown: BriefMetrics['objectiveBreakdown'] } {
  const objectiveBreakdown: BriefMetrics['objectiveBreakdown'] = [];

  for (const objective of projectObjectives) {
    // Find questions that address this objective
    const relatedQuestions = guide.questions.filter(
      q => q.objective && q.objective.toLowerCase().includes(objective.toLowerCase())
    );

    // Check how many of these questions were actually asked
    const askedQuestions = relatedQuestions.filter(q =>
      transcript.some(m => m.role === 'agent' && m.metadata?.questionId === q.id)
    );

    const coverage = relatedQuestions.length > 0 
      ? (askedQuestions.length / relatedQuestions.length) * 100 
      : 0;

    objectiveBreakdown.push({
      objective,
      coverage: Math.round(coverage * 10) / 10,
      questionsAddressing: askedQuestions.map(q => q.id)
    });
  }

  // Overall coverage
  const totalCoverage = objectiveBreakdown.length > 0
    ? objectiveBreakdown.reduce((sum, obj) => sum + obj.coverage, 0) / objectiveBreakdown.length
    : 0;

  return {
    objectiveCoverage: Math.round(totalCoverage * 10) / 10,
    objectiveBreakdown
  };
}

/**
 * Evaluate if the interview length was realistic
 */
function evaluateLengthRealism(
  transcript: ConversationMessage[],
  guide: InterviewGuide
): BriefMetrics['lengthRealism'] {
  const estimated = guide.estimatedDuration;
  
  // Calculate actual duration from transcript
  if (transcript.length === 0) {
    return {
      estimated,
      actual: 0,
      variance: 100,
      realistic: false
    };
  }

  const startTime = transcript[0].timestamp;
  const endTime = transcript[transcript.length - 1].timestamp;
  const actual = (endTime - startTime) / 1000 / 60; // minutes

  const variance = estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0;
  const realistic = Math.abs(variance) <= 20; // Within 20% is considered realistic

  return {
    estimated: Math.round(estimated * 10) / 10,
    actual: Math.round(actual * 10) / 10,
    variance: Math.round(variance * 10) / 10,
    realistic
  };
}

