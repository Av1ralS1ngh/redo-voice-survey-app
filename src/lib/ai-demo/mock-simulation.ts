import { Persona, SimulationResult, ConversationMessage } from './types';
import type { SimulationConfig } from './simulation-engine';
import { evaluateAgentPerformance } from './evaluators/agent-evaluator';
import { evaluateBriefQuality } from './evaluators/brief-evaluator';

type ProgressCallback = (progress: { message: string; turn: number }) => void;

const BASE_TURN_DURATION_MS = 45 * 1000; // 45 seconds per turn baseline

function buildAgentMessage(
  content: string,
  timestamp: number,
  metadata: ConversationMessage['metadata']
): ConversationMessage {
  return {
    role: 'agent',
    content,
    timestamp,
    metadata
  };
}

function buildParticipantMessage(
  content: string,
  timestamp: number,
  metadata?: ConversationMessage['metadata']
): ConversationMessage {
  return {
    role: 'user',
    content,
    timestamp,
    metadata
  };
}

function synthesizeParticipantResponse(
  persona: Persona,
  question: string,
  objective?: string
): string {
  const tonePrefix = persona.responsePatterns.detailLevel === 'high'
    ? 'Absolutely—'
    : persona.responsePatterns.detailLevel === 'low'
    ? 'Honestly, '
    : 'I think ';

  const traitInfluence = persona.traits.slice(0, 2).map((trait) => trait.toLowerCase()).join(' and ');
  const objectiveClause = objective
    ? `It ties back to ${objective.toLowerCase()}, which really matters in my day-to-day.`
    : 'It affects how I handle things every day.';

  const cooperationModifier = persona.behaviorModel.cooperativeness < 50
    ? ' I have to admit, I get a bit skeptical with questions like this.'
    : persona.behaviorModel.cooperativeness > 80
    ? ' I love talking about this because it feels important.'
    : '';

  return `${tonePrefix}${question.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase()}? For me, it usually plays out based on ${traitInfluence}. ${objectiveClause}${cooperationModifier}`;
}

function synthesizeProbe(question: string, objective?: string): string {
  const baseProbe = 'Can you share a concrete example that captures what you just described?';
  if (!objective) {
    return baseProbe;
  }
  return `Could you give an example that shows how this impacts ${objective.toLowerCase()}?`;
}

function maybeDropOff(persona: Persona, turn: number): { shouldStop: boolean; message?: string } {
  if (persona.id !== 'difficult') {
    return { shouldStop: false };
  }

  // Difficult participants occasionally drop off after several turns
  if (turn >= 6 && Math.random() < 0.3) {
    return {
      shouldStop: true,
      message: "Honestly, I'm feeling done with this conversation now."
    };
  }

  return { shouldStop: false };
}

async function constructMetrics(
  transcript: ConversationMessage[],
  persona: Persona,
  config: SimulationConfig
) {
  const agentMetrics = await evaluateAgentPerformance(transcript, config.interviewGuide, persona);
  const briefMetrics = await evaluateBriefQuality(
    transcript,
    config.interviewGuide,
    config.briefContent,
    config.projectObjectives,
    persona
  );

  return { agentMetrics, briefMetrics };
}

export async function runMockSimulation(
  persona: Persona,
  config: SimulationConfig,
  onProgress?: ProgressCallback
): Promise<SimulationResult> {
  const startTime = Date.now();
  let currentTimestamp = startTime;
  let currentTurn = 0;
  let completed = true;
  let dropOffReason: string | undefined;
  let droppedAt: string | undefined;

  const transcript: ConversationMessage[] = [];

  const pushAgent = (
    content: string,
    metadata: ConversationMessage['metadata']
  ) => {
    currentTimestamp += BASE_TURN_DURATION_MS;
    transcript.push(buildAgentMessage(content, currentTimestamp, metadata));
  };

  const pushParticipant = (
    content: string,
    metadata?: ConversationMessage['metadata']
  ) => {
    currentTimestamp += (persona.responsePatterns.responseTime || 35) * 1000;
    transcript.push(buildParticipantMessage(content, currentTimestamp, metadata));
  };

  onProgress?.({ message: `Starting interview with ${persona.name}...`, turn: currentTurn });
  pushAgent(
    `Hi ${persona.name}, thanks for joining today. I'd love to walk through a few questions.`,
    { questionId: 'opening' }
  );

  for (const question of config.interviewGuide.questions) {
    if (question.type === 'probe') continue;

    currentTurn += 1;
    onProgress?.({ message: `Turn ${currentTurn}: Asking ${question.question}`, turn: currentTurn });

    pushAgent(question.question, { questionId: question.id });

    const response = synthesizeParticipantResponse(persona, question.question, question.objective);
    pushParticipant(response, { questionId: question.id });

    if (persona.behaviorModel.tangentRate > 0.3) {
      pushParticipant(
        'That reminds me of a related situation that probably sounds a bit off-topic, but it stuck with me.',
        { questionId: question.id }
      );
    }

    if (persona.responsePatterns.detailLevel !== 'low') {
      pushAgent(
        synthesizeProbe(question.question, question.objective),
        { questionId: question.id, isProbe: true }
      );
      pushParticipant(
        `Sure — one specific moment was when our team struggled to align on ${
          question.objective ? question.objective.toLowerCase() : 'that issue'
        }, and it forced us to rethink our approach.`,
        { questionId: question.id }
      );
    }

    const dropEvaluation = maybeDropOff(persona, currentTurn);
    if (dropEvaluation.shouldStop) {
      pushParticipant(dropEvaluation.message || "I'm going to pause here." , {
        questionId: question.id
      });
      completed = false;
      dropOffReason = 'Participant opted out mid-interview';
      droppedAt = question.id;
      break;
    }
  }

  if (completed) {
    pushAgent(
      'Thank you so much for your time and thoughtful answers. This concludes our interview!',
      { questionId: 'closing' }
    );
  }

  const durationMinutes = Math.max(3, (currentTimestamp - startTime) / 1000 / 60);

  onProgress?.({ message: completed ? 'All questions covered!' : 'Interview ended early.', turn: currentTurn });
  onProgress?.({ message: 'Evaluating performance...', turn: currentTurn });

  const { agentMetrics, briefMetrics } = await constructMetrics(transcript, persona, config);

  return {
    personaId: persona.id,
    completed,
    droppedAt,
    dropOffReason,
    transcript,
    duration: Math.round(durationMinutes * 10) / 10,
    metrics: {
      agent: agentMetrics,
      brief: briefMetrics
    },
    completedAt: new Date().toISOString()
  };
}
