/**
 * AI Demo Generation - Type Definitions
 * Text-based simulation of interviews with different participant personas
 */

export type PersonaId = 'ideal' | 'typical' | 'difficult';

export interface Persona {
  id: PersonaId;
  name: string;
  description: string;
  traits: string[];
  behaviorModel: {
    comprehension: 'high' | 'medium' | 'low';
    cooperativeness: number; // 0-100
    tangentRate: number; // 0-1 (likelihood of going off-topic)
    fatigueRate: number; // degradation per minute
    frustrationThreshold: number; // 0-100
    clarificationLikelihood: number; // 0-1
  };
  responsePatterns: {
    averageWordCount: number;
    detailLevel: 'high' | 'medium' | 'low';
    responseTime: number; // seconds (for duration estimation)
  };
}

export interface ConversationMessage {
  role: 'agent' | 'user';
  content: string;
  timestamp: number;
  metadata?: {
    questionId?: string;
    isProbe?: boolean;
    wordCount?: number;
    duration?: number; // estimated seconds
    forcedCompletion?: boolean; // true if interview was force-stopped due to turn limit
  };
}

export interface SimulationResult {
  personaId: PersonaId;
  completed: boolean;
  droppedAt?: string; // question ID where they dropped off
  dropOffReason?: string;
  transcript: ConversationMessage[];
  duration: number; // total minutes
  metrics: {
    agent: AgentMetrics;
    brief: BriefMetrics;
  };
  completedAt: string;
}

export interface AgentMetrics {
  coverageRate: number; // 0-100% (questions asked / total questions)
  questionsAsked: number;
  totalQuestions: number;
  missedQuestions: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  
  averageTime: number; // minutes
  timeVariance: number; // % difference from estimate
  
  adversarialScore: number; // 0-10
  adversarialHandling: {
    profanityOccurrences: number;
    profanityHandled: number;
    offTopicTangents: number;
    successfulRedirects: number;
    refusals: number;
    gracefulHandling: number;
  };
  
  probingQuality: number; // 0-10
  probingDetails: {
    totalProbes: number;
    relevantProbes: number;
    insightfulProbes: number;
    genericProbes: number;
    irrelevantProbes: number;
  };
}

export interface BriefMetrics {
  clarityIndex: number; // 0-10 average
  questionClarity: Array<{
    questionId: string;
    question: string;
    clarityScore: number; // 0-10
    issues: string[];
    clarificationsNeeded: number;
  }>;
  
  objectiveCoverage: number; // 0-100%
  objectiveBreakdown: Array<{
    objective: string;
    coverage: number; // 0-100%
    questionsAddressing: string[];
  }>;
  
  lengthRealism: {
    estimated: number; // minutes
    actual: number; // minutes
    variance: number; // %
    realistic: boolean; // within 20%
  };
}

export interface DemoEvaluation {
  agentMetrics: {
    averageCoverageRate: number;
    averageTime: number;
    averageAdversarialScore: number;
    averageProbingQuality: number;
    details: AgentMetrics[];
  };
  briefMetrics: {
    averageClarityIndex: number;
    objectiveCoverage: number;
    lengthRealism: BriefMetrics['lengthRealism'];
    highRiskQuestions: BriefMetrics['questionClarity'];
  };
  recommendations: Recommendation[];
  overallScore: {
    agent: number; // 0-10
    brief: number; // 0-10
    readyToLaunch: boolean;
  };
}

export interface Recommendation {
  type: 'critical' | 'warning' | 'suggestion';
  category: 'question_clarity' | 'coverage' | 'length' | 'agent_performance' | 'pacing';
  title: string;
  description: string;
  impact: string;
  actionable: string;
  affectedQuestions?: string[];
}

export interface InterviewGuide {
  questions: Array<{
    id: string;
    question: string;
    type: 'open' | 'closed' | 'probe';
    objective?: string;
    expectedDuration?: number; // seconds
  }>;
  estimatedDuration: number; // minutes
}

