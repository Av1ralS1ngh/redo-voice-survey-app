/**
 * AI Demo Orchestrator
 * Main component that manages the AI demo generation flow
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import GenerationProgress from './GenerationProgress';
import AIDemoDashboard from './AIDemoDashboard';
import TranscriptViewer from './TranscriptViewer';
import { DemoEvaluation, SimulationResult } from '@/lib/ai-demo/types';
import { Sparkles } from 'lucide-react';

interface PersonaProgress {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  turn: number;
  message: string;
  duration?: number;
  messagesCount?: number;
  error?: string;
}

interface AIDemoOrchestratorProps {
  projectId: string;
  briefContent: string;
  interviewGuideContent: string;
  estimatedDuration?: number;
  onComplete?: (demoId: string) => void;
  // Props for persisting results across mode switches
  persistedResults?: SimulationResult[] | null;
  persistedEvaluation?: DemoEvaluation | null;
  onResultsChange?: (results: SimulationResult[] | null) => void;
  onEvaluationChange?: (evaluation: DemoEvaluation | null) => void;
}

export default function AIDemoOrchestrator({
  projectId,
  briefContent,
  interviewGuideContent,
  estimatedDuration,
  onComplete,
  persistedResults,
  persistedEvaluation,
  onResultsChange,
  onEvaluationChange
}: AIDemoOrchestratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [personas, setPersonas] = useState<PersonaProgress[]>([]);
  
  // Use persisted state if available, otherwise use local state
  const results = persistedResults;
  const evaluation = persistedEvaluation;
  const setResults = onResultsChange || (() => {});
  const setEvaluation = onEvaluationChange || (() => {});
  
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackContent, setUsingFallbackContent] = useState(false);

  const trimmedProjectId = projectId?.trim() || 'demo-project';

  const { hasBriefContent, hasGuideContent } = useMemo(() => {
    const hasBrief = typeof briefContent === 'string' && briefContent.trim().length > 0;
    const hasGuide = typeof interviewGuideContent === 'string' && interviewGuideContent.trim().length > 0;
    return {
      hasBriefContent: hasBrief,
      hasGuideContent: hasGuide,
    };
  }, [briefContent, interviewGuideContent]);

  const buildFallbackBrief = useCallback(() => {
    return `## Project Objectives
- Understand how participants currently experience the product
- Surface top frustrations and unmet needs
- Identify opportunities to improve the end-to-end journey

## Participant Profile
- Existing or prospective users who can speak to recent product usage
- Comfortable sharing honest feedback in a conversational setting

## Success Criteria
- Capture at least three concrete stories about the workflow
- Learn where expectations are exceeded or missed
- Gather verbatim quotes to inform the product roadmap`;
  }, []);

  const buildFallbackGuide = useCallback(() => {
    return `## Interview Flow

### Opening
- Thanks for making the time today. I'd love to learn about your recent experiences.

### Warm-up
- Could you walk me through how you last used the product?
- What were you hoping to accomplish?

### Deep Dive
- What parts went smoothly?
- Where did you run into friction or frustration?
- How are you solving this today?

### Wrap-up
- If you could change one thing, what would it be?
- Anything else we should know before we wrap?`;
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setResults(null);
    setEvaluation(null);

    try {
      const fallbackBrief = hasBriefContent ? briefContent.trim() : buildFallbackBrief();
      const fallbackGuide = hasGuideContent ? interviewGuideContent.trim() : buildFallbackGuide();
      const safeEstimatedDuration = typeof estimatedDuration === 'number' ? estimatedDuration : 15;

      setUsingFallbackContent(!hasBriefContent || !hasGuideContent);

      const response = await fetch('/api/ai-demo/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: trimmedProjectId,
          briefContent: fallbackBrief,
          interviewGuideContent: fallbackGuide,
          estimatedDuration: safeEstimatedDuration
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate AI demo');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream not available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'init':
                setPersonas(data.personas.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  status: 'pending',
                  turn: 0,
                  message: 'Waiting to start...'
                })));
                break;

              case 'persona_start':
                setPersonas(prev => prev.map((p, i) =>
                  i === data.index
                    ? { ...p, status: 'running', message: 'Starting interview...' }
                    : p
                ));
                break;

              case 'persona_progress':
                setPersonas(prev => prev.map((p, i) =>
                  i === data.index
                    ? { ...p, turn: data.turn, message: data.message }
                    : p
                ));
                break;

              case 'persona_complete':
                setPersonas(prev => prev.map((p, i) =>
                  i === data.index
                    ? {
                        ...p,
                        status: 'complete',
                        message: 'Completed',
                        duration: data.duration,
                        messagesCount: data.messagesCount
                      }
                    : p
                ));
                break;

              case 'persona_error':
                setPersonas(prev => prev.map((p, i) =>
                  i === data.index
                    ? { ...p, status: 'error', message: 'Failed', error: data.error }
                    : p
                ));
                break;

              case 'evaluating':
                setIsEvaluating(true);
                break;

              case 'complete':
                setResults(data.results);
                setEvaluation(data.evaluation);
                setIsGenerating(false);
                setIsEvaluating(false);
                setShowDashboard(true);
                if (onComplete) {
                  onComplete(data.demoId);
                }
                break;

              case 'error':
                throw new Error(data.message);
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
        }
      }
    } catch (err) {
      console.error('AI Demo generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate AI demo');
      setIsGenerating(false);
      setIsEvaluating(false);
    }
  }, [buildFallbackBrief, buildFallbackGuide, briefContent, hasBriefContent, hasGuideContent, interviewGuideContent, estimatedDuration, onComplete, trimmedProjectId]);

  const handleClose = () => {
    setShowDashboard(false);
    setShowTranscripts(false);
  };

  return (
    <>
      {/* Generate Button */}
      {!isGenerating && !results && (
        <button
          onClick={handleGenerate}
          disabled={!trimmedProjectId || isGenerating}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-base font-semibold rounded-lg hover:bg-black transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          Generate AI Demo
        </button>
      )}

      {!isGenerating && !results && (!hasBriefContent || !hasGuideContent) && (
        <p className="mt-2 text-xs text-gray-500">
          No finalized brief or interview guide detected. We’ll use a starter template so you can still preview the demo.
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
          <button
            onClick={handleGenerate}
            className="text-sm text-red-600 hover:text-red-800 underline mt-2"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results Summary (after completion) */}
      {results && evaluation && !showDashboard && (
        <div className="mt-4 space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium mb-2">
              ✓ AI Demo completed successfully!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDashboard(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                View Results
              </button>
              <button
                onClick={() => setShowTranscripts(true)}
                className="px-4 py-2 bg-white border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
              >
                View Transcripts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {isGenerating && (
        <GenerationProgress
          personas={personas}
          isEvaluating={isEvaluating}
          onCancel={() => {
            setIsGenerating(false);
            setPersonas([]);
          }}
        />
      )}

      {/* Dashboard Modal */}
      {showDashboard && results && evaluation && (
        <AIDemoDashboard
          results={results}
          evaluation={evaluation}
          onClose={handleClose}
        />
      )}

      {/* Transcript Modal */}
      {showTranscripts && results && (
        <TranscriptViewer
          results={results}
          onClose={() => setShowTranscripts(false)}
        />
      )}

      {usingFallbackContent && !isGenerating && results && (
        <p className="mt-4 text-xs text-gray-500">
          This run used starter content. Update your research brief or interview guide to personalize future demos.
        </p>
      )}
    </>
  );
}

