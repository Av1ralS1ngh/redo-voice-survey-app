/**
 * Agent Performance Evaluator
 * Evaluates the AI agent's performance during the interview
 */

import { ConversationMessage, AgentMetrics, InterviewGuide, Persona } from '../types';

/**
 * Evaluate how well the AI agent performed during the interview
 */
export async function evaluateAgentPerformance(
  transcript: ConversationMessage[],
  guide: InterviewGuide,
  persona: Persona
): Promise<AgentMetrics> {
  // 1. Question Coverage Rate
  const { coverageRate, questionsAsked, missedQuestions } = evaluateQuestionCoverage(transcript, guide);

  // 2. Average Time to Complete
  const averageTime = calculateAverageTime(transcript);
  const timeVariance = calculateTimeVariance(averageTime, guide.estimatedDuration);

  // 3. Adversarial Handling
  const adversarialScore = evaluateAdversarialHandling(transcript, persona);

  // 4. Probing Quality
  const { probingQuality, probingDetails } = evaluateProbingQuality(transcript, guide);

  return {
    coverageRate,
    questionsAsked,
    totalQuestions: guide.questions.filter(q => q.type !== 'probe').length,
    missedQuestions,
    averageTime,
    timeVariance,
    adversarialScore,
    adversarialHandling: calculateAdversarialHandling(transcript),
    probingQuality,
    probingDetails
  };
}

/**
 * Evaluate question coverage - did agent ask all questions?
 */
function evaluateQuestionCoverage(
  transcript: ConversationMessage[],
  guide: InterviewGuide
) {
  const mainQuestions = guide.questions.filter(q => q.type !== 'probe');
  const askedQuestionIds = new Set(
    transcript
      .filter(m => m.role === 'agent' && m.metadata?.questionId)
      .map(m => m.metadata!.questionId)
      .filter(id => id && id !== 'opening' && id !== 'closing')
  );

  const questionsAsked = askedQuestionIds.size;
  const totalQuestions = mainQuestions.length;
  const coverageRate = totalQuestions > 0 ? (questionsAsked / totalQuestions) * 100 : 0;

  // Identify missed questions
  const missedQuestions = mainQuestions
    .filter(q => !askedQuestionIds.has(q.id))
    .map(q => ({
      id: q.id,
      title: q.question,
      reason: inferMissReason(transcript, q.id)
    }));

  return {
    coverageRate: Math.round(coverageRate * 10) / 10,
    questionsAsked,
    missedQuestions
  };
}

/**
 * Calculate average interview duration
 */
function calculateAverageTime(transcript: ConversationMessage[]): number {
  if (transcript.length === 0) return 0;
  
  const startTime = transcript[0].timestamp;
  const endTime = transcript[transcript.length - 1].timestamp;
  const durationMs = endTime - startTime;
  const durationMinutes = durationMs / 1000 / 60;
  
  return Math.round(durationMinutes * 10) / 10;
}

/**
 * Calculate time variance from estimate
 */
function calculateTimeVariance(actual: number, estimated: number): number {
  if (estimated === 0) return 0;
  const variance = ((actual - estimated) / estimated) * 100;
  return Math.round(variance * 10) / 10;
}

/**
 * Evaluate how well agent handled adversarial situations
 */
function evaluateAdversarialHandling(
  transcript: ConversationMessage[],
  persona: Persona
): number {
  // If persona wasn't difficult, score is N/A (use 10 as default)
  if (persona.behaviorModel.cooperativeness > 70) {
    return 10;
  }

  const adversarialHandling = calculateAdversarialHandling(transcript);
  
  // Calculate score based on handling
  let score = 5; // base score
  
  // Bonus for successful redirects
  if (adversarialHandling.offTopicTangents > 0) {
    const redirectRate = adversarialHandling.successfulRedirects / adversarialHandling.offTopicTangents;
    score += redirectRate * 3;
  }
  
  // Bonus for handling profanity professionally
  if (adversarialHandling.profanityOccurrences > 0) {
    const handlingRate = adversarialHandling.profanityHandled / adversarialHandling.profanityOccurrences;
    score += handlingRate * 2;
  }
  
  // Bonus for graceful handling
  if (adversarialHandling.gracefulHandling > 0) {
    score += Math.min(adversarialHandling.gracefulHandling * 0.5, 2);
  }
  
  return Math.min(Math.round(score * 10) / 10, 10);
}

/**
 * Calculate adversarial handling metrics
 */
function calculateAdversarialHandling(transcript: ConversationMessage[]) {
  let profanityOccurrences = 0;
  let profanityHandled = 0;
  let offTopicTangents = 0;
  let successfulRedirects = 0;
  let refusals = 0;
  let gracefulHandling = 0;

  const profanityPatterns = [
    /\b(damn|hell|crap|shit|fuck|ass|bitch)\b/i,
    /frustrated/i,
    /annoyed/i
  ];

  const tangentPatterns = [
    /by the way/i,
    /speaking of/i,
    /reminds me/i,
    /off topic/i
  ];

  const redirectPatterns = [
    /let.{0,10}bring.{0,10}back/i,
    /return to/i,
    /focus on/i,
    /getting back to/i
  ];

  const refusalPatterns = [
    /don't want to/i,
    /not comfortable/i,
    /prefer not to/i,
    /skip this/i
  ];

  for (let i = 0; i < transcript.length; i++) {
    const message = transcript[i];
    const content = message.content.toLowerCase();

    // Check user messages for issues
    if (message.role === 'user') {
      // Profanity
      if (profanityPatterns.some(p => p.test(content))) {
        profanityOccurrences++;
        
        // Check if agent handled it in next message
        if (i + 1 < transcript.length && transcript[i + 1].role === 'agent') {
          const agentResponse = transcript[i + 1].content.toLowerCase();
          if (agentResponse.includes('understand') || agentResponse.includes('appreciate')) {
            profanityHandled++;
            gracefulHandling++;
          }
        }
      }

      // Tangents
      if (tangentPatterns.some(p => p.test(content))) {
        offTopicTangents++;
      }

      // Refusals
      if (refusalPatterns.some(p => p.test(content))) {
        refusals++;
      }
    }

    // Check agent messages for redirects
    if (message.role === 'agent' && redirectPatterns.some(p => p.test(content))) {
      successfulRedirects++;
    }
  }

  return {
    profanityOccurrences,
    profanityHandled,
    offTopicTangents,
    successfulRedirects,
    refusals,
    gracefulHandling
  };
}

/**
 * Evaluate quality of probing questions
 */
function evaluateProbingQuality(
  transcript: ConversationMessage[],
  guide: InterviewGuide
): { probingQuality: number; probingDetails: AgentMetrics['probingDetails'] } {
  const probes = transcript.filter(m => m.role === 'agent' && m.metadata?.isProbe);
  
  if (probes.length === 0) {
    return {
      probingQuality: 5, // neutral score if no probes
      probingDetails: {
        totalProbes: 0,
        relevantProbes: 0,
        insightfulProbes: 0,
        genericProbes: 0,
        irrelevantProbes: 0
      }
    };
  }

  let relevantProbes = 0;
  let insightfulProbes = 0;
  let genericProbes = 0;
  let irrelevantProbes = 0;

  const insightfulPatterns = [
    /why.*important/i,
    /how.*different/i,
    /what.*impact/i,
    /can you compare/i,
    /what.*alternative/i
  ];

  const genericPatterns = [
    /tell me more/i,
    /can you elaborate/i,
    /anything else/i,
    /what else/i
  ];

  for (const probe of probes) {
    const content = probe.content;

    if (insightfulPatterns.some(p => p.test(content))) {
      insightfulProbes++;
      relevantProbes++;
    } else if (genericPatterns.some(p => p.test(content))) {
      genericProbes++;
      relevantProbes++;
    } else {
      // Check if it relates to previous user response
      const probeIndex = transcript.indexOf(probe);
      if (probeIndex > 0 && transcript[probeIndex - 1].role === 'user') {
        relevantProbes++;
      } else {
        irrelevantProbes++;
      }
    }
  }

  // Calculate quality score (0-10)
  const insightfulRate = insightfulProbes / probes.length;
  const relevantRate = relevantProbes / probes.length;
  const probingQuality = Math.round((insightfulRate * 6 + relevantRate * 4) * 10 * 10) / 10;

  return {
    probingQuality: Math.min(probingQuality, 10),
    probingDetails: {
      totalProbes: probes.length,
      relevantProbes,
      insightfulProbes,
      genericProbes,
      irrelevantProbes
    }
  };
}

/**
 * Infer why a question was missed
 */
function inferMissReason(transcript: ConversationMessage[], questionId: string): string {
  // Simple heuristics
  const lastMessage = transcript[transcript.length - 1];
  
  if (lastMessage.role === 'user' && 
      (lastMessage.content.toLowerCase().includes('tired') || 
       lastMessage.content.toLowerCase().includes('done'))) {
    return 'Participant ended interview early';
  }

  if (transcript.length > 50) {
    return 'Interview ran long, question not reached';
  }

  return 'Question not covered in conversation flow';
}

