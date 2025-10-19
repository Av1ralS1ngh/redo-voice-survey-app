/**
 * Recommendation Generator
 * Generates actionable recommendations based on evaluation metrics
 */

import { AgentMetrics, BriefMetrics, Recommendation, DemoEvaluation } from '../types';

/**
 * Generate recommendations from all simulation results
 */
export function generateRecommendations(
  agentMetrics: AgentMetrics[],
  briefMetrics: BriefMetrics
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Question Coverage Issues
  const avgCoverage = agentMetrics.reduce((sum, m) => sum + m.coverageRate, 0) / agentMetrics.length;
  if (avgCoverage < 80) {
    recommendations.push({
      type: 'critical',
      category: 'coverage',
      title: 'Low Question Coverage Detected',
      description: `Agent only covered ${avgCoverage.toFixed(1)}% of questions on average. Several questions were consistently missed.`,
      impact: 'You may not gather all the insights you need from real interviews.',
      actionable: 'Review missed questions and consider: (1) Reducing total number of questions, (2) Reordering questions to prioritize key ones, (3) Simplifying question wording to speed up conversations.',
      affectedQuestions: getMostMissedQuestions(agentMetrics)
    });
  } else if (avgCoverage < 90) {
    recommendations.push({
      type: 'warning',
      category: 'coverage',
      title: 'Moderate Question Coverage',
      description: `Agent covered ${avgCoverage.toFixed(1)}% of questions. Some questions were occasionally missed.`,
      impact: 'Most insights will be captured, but you may have some gaps.',
      actionable: 'Consider reordering questions to ensure priority topics are covered first.',
      affectedQuestions: getMostMissedQuestions(agentMetrics)
    });
  }

  // 2. Time Variance Issues
  const avgTime = agentMetrics.reduce((sum, m) => sum + m.averageTime, 0) / agentMetrics.length;
  const avgVariance = agentMetrics.reduce((sum, m) => sum + Math.abs(m.timeVariance), 0) / agentMetrics.length;
  
  if (avgVariance > 30) {
    const direction = avgTime > briefMetrics.lengthRealism.estimated ? 'longer' : 'shorter';
    recommendations.push({
      type: 'warning',
      category: 'length',
      title: `Interview Duration ${direction === 'longer' ? 'Significantly Longer' : 'Significantly Shorter'} Than Expected`,
      description: `Actual interviews took ${avgTime.toFixed(1)} minutes vs. estimated ${briefMetrics.lengthRealism.estimated} minutes (${avgVariance.toFixed(1)}% variance).`,
      impact: direction === 'longer' 
        ? 'Participants may experience fatigue or drop off before completion.'
        : 'You may not be gathering enough depth in responses.',
      actionable: direction === 'longer'
        ? 'Consider: (1) Reducing number of questions, (2) Simplifying questions to get quicker responses, (3) Adjusting time estimate for participant recruitment.'
        : 'Consider: (1) Adding more probing questions, (2) Encouraging more detailed responses in your agent instructions.'
    });
  }

  // 3. Question Clarity Issues
  const lowClarityQuestions = briefMetrics.questionClarity.filter(q => q.clarityScore < 7);
  if (lowClarityQuestions.length > 0) {
    const severity = lowClarityQuestions.some(q => q.clarityScore < 5) ? 'critical' : 'warning';
    recommendations.push({
      type: severity,
      category: 'question_clarity',
      title: `${lowClarityQuestions.length} Question(s) Have Clarity Issues`,
      description: `Questions caused confusion or required clarification, even with different participant types.`,
      impact: 'Participants may misunderstand questions, leading to unusable responses or frustration.',
      actionable: 'Revise these questions to be more specific and clear. Consider: (1) Breaking complex questions into smaller parts, (2) Providing examples, (3) Using simpler language.',
      affectedQuestions: lowClarityQuestions.map(q => q.questionId)
    });
  }

  // 4. Objective Coverage Issues
  if (briefMetrics.objectiveCoverage < 80) {
    const lowCoverageObjectives = briefMetrics.objectiveBreakdown.filter(obj => obj.coverage < 70);
    recommendations.push({
      type: 'critical',
      category: 'coverage',
      title: 'Project Objectives Not Fully Covered',
      description: `Only ${briefMetrics.objectiveCoverage.toFixed(1)}% of project objectives were adequately addressed.`,
      impact: 'You may not achieve your research goals.',
      actionable: `Add more questions targeting: ${lowCoverageObjectives.map(obj => obj.objective).join(', ')}. Ensure each objective has at least 2-3 questions addressing it.`
    });
  }

  // 5. Adversarial Handling (if applicable)
  const difficultPersonaMetrics = agentMetrics.find(m => m.adversarialHandling.offTopicTangents > 0);
  if (difficultPersonaMetrics) {
    const avgAdversarialScore = agentMetrics
      .filter(m => m.adversarialHandling.offTopicTangents > 0)
      .reduce((sum, m) => sum + m.adversarialScore, 0) / 
      agentMetrics.filter(m => m.adversarialHandling.offTopicTangents > 0).length;

    if (avgAdversarialScore < 6) {
      recommendations.push({
        type: 'warning',
        category: 'agent_performance',
        title: 'Agent Struggled with Difficult Participants',
        description: `Agent had difficulty managing tangents and frustration (score: ${avgAdversarialScore.toFixed(1)}/10).`,
        impact: 'Real interviews with challenging participants may not go smoothly.',
        actionable: 'This is expected with early testing. In production, the agent will improve over time. Consider adding clearer redirection prompts in your interview guide.'
      });
    }
  }

  // 6. Probing Quality
  const avgProbingQuality = agentMetrics.reduce((sum, m) => sum + m.probingQuality, 0) / agentMetrics.length;
  if (avgProbingQuality < 6) {
    recommendations.push({
      type: 'suggestion',
      category: 'agent_performance',
      title: 'Limited Depth in Follow-up Questions',
      description: `Agent's probing questions were mostly generic (score: ${avgProbingQuality.toFixed(1)}/10).`,
      impact: 'You may miss opportunities to gather deeper insights.',
      actionable: 'Add example probing questions in your interview guide for each main question. This will help the agent understand what depth you\'re looking for.'
    });
  }

  // 7. Pacing Issues
  const questionsPerMinute = agentMetrics.map(m => m.questionsAsked / m.averageTime);
  const avgQuestionsPerMinute = questionsPerMinute.reduce((sum, qpm) => sum + qpm, 0) / questionsPerMinute.length;
  
  if (avgQuestionsPerMinute > 2) {
    recommendations.push({
      type: 'suggestion',
      category: 'pacing',
      title: 'Interview Pacing May Be Too Fast',
      description: `Agent is asking ${avgQuestionsPerMinute.toFixed(1)} questions per minute on average.`,
      impact: 'Participants may feel rushed and not provide thoughtful responses.',
      actionable: 'Consider allowing more time for reflection. Add prompts for the agent to pause and encourage detailed responses.'
    });
  } else if (avgQuestionsPerMinute < 0.5) {
    recommendations.push({
      type: 'suggestion',
      category: 'pacing',
      title: 'Interview Pacing May Be Too Slow',
      description: `Agent is asking only ${avgQuestionsPerMinute.toFixed(1)} questions per minute on average.`,
      impact: 'Interviews may feel sluggish, and participants might lose engagement.',
      actionable: 'Consider simplifying questions or reducing follow-up probes to maintain momentum.'
    });
  }

  // Sort by priority: critical > warning > suggestion
  const priorityOrder = { critical: 0, warning: 1, suggestion: 2 };
  recommendations.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);

  return recommendations;
}

/**
 * Get the questions that were most frequently missed
 */
function getMostMissedQuestions(agentMetrics: AgentMetrics[]): string[] {
  const missedCounts = new Map<string, number>();

  for (const metrics of agentMetrics) {
    for (const missed of metrics.missedQuestions) {
      missedCounts.set(missed.id, (missedCounts.get(missed.id) || 0) + 1);
    }
  }

  // Return questions missed in more than 50% of simulations
  const threshold = agentMetrics.length / 2;
  return Array.from(missedCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([id, _]) => id);
}

/**
 * Calculate overall evaluation scores
 */
export function calculateOverallScores(
  agentMetrics: AgentMetrics[],
  briefMetrics: BriefMetrics,
  recommendations: Recommendation[]
): DemoEvaluation['overallScore'] {
  // Agent score (0-10)
  const avgCoverage = agentMetrics.reduce((sum, m) => sum + m.coverageRate, 0) / agentMetrics.length / 10;
  const avgAdversarial = agentMetrics.reduce((sum, m) => sum + m.adversarialScore, 0) / agentMetrics.length;
  const avgProbing = agentMetrics.reduce((sum, m) => sum + m.probingQuality, 0) / agentMetrics.length;
  
  const agentScore = (avgCoverage * 0.5 + avgAdversarial * 0.25 + avgProbing * 0.25);

  // Brief score (0-10)
  const clarityScore = briefMetrics.clarityIndex;
  const objectiveScore = briefMetrics.objectiveCoverage / 10;
  const lengthScore = briefMetrics.lengthRealism.realistic ? 10 : 5;
  
  const briefScore = (clarityScore * 0.5 + objectiveScore * 0.3 + lengthScore * 0.2);

  // Ready to launch if:
  // - Agent score >= 7
  // - Brief score >= 7
  // - No critical issues
  const criticalIssues = recommendations.filter(r => r.type === 'critical').length;
  const readyToLaunch = agentScore >= 7 && briefScore >= 7 && criticalIssues === 0;

  return {
    agent: Math.round(agentScore * 10) / 10,
    brief: Math.round(briefScore * 10) / 10,
    readyToLaunch
  };
}

