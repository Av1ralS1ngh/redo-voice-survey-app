/**
 * AI Demo Streaming API
 * Provides real-time progress updates during simulation generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPersonas } from '@/lib/ai-demo/personas';
import { runSimulation, SimulationConfig } from '@/lib/ai-demo/simulation-engine';
import { parseInterviewGuide, extractObjectives } from '@/lib/ai-demo/guide-parser';
import { generateRecommendations, calculateOverallScores } from '@/lib/ai-demo/evaluators/recommendation-generator';
import { checkRateLimit, incrementRateLimit } from '@/lib/ai-demo/rate-limiter';
import { DemoEvaluation, SimulationResult } from '@/lib/ai-demo/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  const { projectId, briefContent, interviewGuideContent, estimatedDuration } = await req.json();

  // Validation
  if (!projectId || !briefContent || !interviewGuideContent) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Check rate limits
  const rateLimitCheck = checkRateLimit(projectId);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { error: rateLimitCheck.reason, resetAt: rateLimitCheck.resetAt },
      { status: 429 }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse interview guide
        const interviewGuide = parseInterviewGuide(interviewGuideContent, estimatedDuration || 15);
        const projectObjectives = extractObjectives(briefContent);

        const config: SimulationConfig = {
          interviewGuide,
          briefContent,
          projectObjectives,
          maxTurns: 100,
          timeoutMinutes: 30
        };

        // Get personas
        const personas = getAllPersonas();

        // Send initial status
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'init',
            personas: personas.map(p => ({ id: p.id, name: p.name })),
            totalQuestions: interviewGuide.questions.length,
            estimatedDuration
          })}\n\n`)
        );

        // Run simulations in parallel with progress updates
        const simulationResults: (SimulationResult | null)[] = [];
        
        const simulationPromises = personas.map(async (persona, index) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'persona_start',
                personaId: persona.id,
                personaName: persona.name,
                index
              })}\n\n`)
            );

            const result = await runSimulation(persona, config, (progress) => {
              // Stream progress updates
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'persona_progress',
                  personaId: persona.id,
                  personaName: persona.name,
                  turn: progress.turn,
                  message: progress.message,
                  index
                })}\n\n`)
              );
            });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'persona_complete',
                personaId: persona.id,
                personaName: persona.name,
                completed: result.completed,
                duration: result.duration,
                messagesCount: result.transcript.length,
                index
              })}\n\n`)
            );

            simulationResults[index] = result;
            return result;

          } catch (error) {
            console.error(`Simulation failed for ${persona.name}:`, error);
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'persona_error',
                personaId: persona.id,
                personaName: persona.name,
                error: error instanceof Error ? error.message : 'Unknown error',
                index
              })}\n\n`)
            );

            simulationResults[index] = null;
            return null;
          }
        });

        await Promise.all(simulationPromises);

        // Filter successful results
        const successfulResults = simulationResults.filter((r): r is SimulationResult => r !== null);

        if (successfulResults.length === 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: 'All simulations failed'
            })}\n\n`)
          );
          controller.close();
          return;
        }

        // Generate evaluation
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'evaluating',
            message: 'Analyzing results and generating recommendations...'
          })}\n\n`)
        );

        const agentMetrics = successfulResults.map(r => r.metrics.agent);
        const briefMetrics = successfulResults[0].metrics.brief;
        const recommendations = generateRecommendations(agentMetrics, briefMetrics);
        const overallScore = calculateOverallScores(agentMetrics, briefMetrics, recommendations);

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

        // Send final results
        const demoId = `demo_${projectId}_${Date.now()}`;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            demoId,
            results: successfulResults,
            evaluation,
            completedAt: new Date().toISOString()
          })}\n\n`)
        );

        controller.close();

      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`)
        );
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

