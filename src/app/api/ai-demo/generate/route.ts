/**
 * AI Demo Generation API
 * Generates simulated interviews with 3 personas in parallel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPersonas } from '@/lib/ai-demo/personas';
import { runSimulation, SimulationConfig } from '@/lib/ai-demo/simulation-engine';
import { parseInterviewGuide, extractObjectives } from '@/lib/ai-demo/guide-parser';
import { generateRecommendations, calculateOverallScores } from '@/lib/ai-demo/evaluators/recommendation-generator';
import { checkRateLimit, incrementRateLimit } from '@/lib/ai-demo/rate-limiter';
import { DemoEvaluation, SimulationResult } from '@/lib/ai-demo/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, briefContent, interviewGuideContent, estimatedDuration } = body;

    // Validation
    if (!projectId || !briefContent || !interviewGuideContent) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, briefContent, interviewGuideContent' },
        { status: 400 }
      );
    }

    // Check rate limits
    const rateLimitCheck = checkRateLimit(projectId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitCheck.reason,
          resetAt: rateLimitCheck.resetAt
        },
        { status: 429 }
      );
    }

    // Parse interview guide
    const interviewGuide = parseInterviewGuide(interviewGuideContent, estimatedDuration || 15);
    const projectObjectives = extractObjectives(briefContent);

    // Prepare simulation config
    const config: SimulationConfig = {
      interviewGuide,
      briefContent,
      projectObjectives,
      maxTurns: 100,
      timeoutMinutes: 30
    };

    // Get all personas
    const personas = getAllPersonas();

    console.log(`Starting AI demo generation for project: ${projectId}`);
    console.log(`- ${personas.length} personas`);
    console.log(`- ${interviewGuide.questions.length} questions`);
    console.log(`- Estimated duration: ${estimatedDuration} minutes`);

    // Run all simulations in parallel
    const simulationPromises = personas.map(persona =>
      runSimulation(persona, config, (progress) => {
        console.log(`[${persona.name}] ${progress.message}`);
      }).catch(error => {
        console.error(`Simulation failed for ${persona.name}:`, error);
        return null; // Return null for failed simulations
      })
    );

    const simulationResults = await Promise.all(simulationPromises);

    // Filter out failed simulations
    const successfulResults = simulationResults.filter((r): r is SimulationResult => r !== null);

    if (successfulResults.length === 0) {
      return NextResponse.json(
        { error: 'All simulations failed. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`Completed ${successfulResults.length}/${personas.length} simulations successfully`);

    // Aggregate metrics
    const agentMetrics = successfulResults.map(r => r.metrics.agent);
    const briefMetrics = successfulResults[0].metrics.brief; // Same for all personas

    // Generate recommendations
    const recommendations = generateRecommendations(agentMetrics, briefMetrics);

    // Calculate overall scores
    const overallScore = calculateOverallScores(agentMetrics, briefMetrics, recommendations);

    // Build evaluation response
    const evaluation: DemoEvaluation = {
      agentMetrics: {
        averageCoverageRate: agentMetrics.reduce((sum, m) => sum + m.coverageRate, 0) / agentMetrics.length,
        averageTime: agentMetrics.reduce((sum, m) => sum + m.averageTime, 0) / agentMetrics.length,
        averageAdversarialScore: agentMetrics.reduce((sum, m) => sum + m.adversarialScore, 0) / agentMetrics.length,
        averageProbingQuality: agentMetrics.reduce((sum, m) => sum + m.probingQuality, 0) / agentMetrics.length,
        details: agentMetrics
      },
      briefMetrics: {
        averageClarityIndex: briefMetrics.clarityIndex,
        objectiveCoverage: briefMetrics.objectiveCoverage,
        lengthRealism: briefMetrics.lengthRealism,
        highRiskQuestions: briefMetrics.questionClarity.filter(q => q.clarityScore < 7)
      },
      recommendations,
      overallScore
    };

    // Increment rate limit
    incrementRateLimit(projectId);

    // Return results
    return NextResponse.json({
      success: true,
      demoId: `demo_${projectId}_${Date.now()}`,
      results: successfulResults,
      evaluation,
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Demo generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate AI demo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

