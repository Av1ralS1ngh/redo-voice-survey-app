/**
 * AI Demo Dashboard
 * Main component for displaying AI demo results and evaluation
 */

'use client';

import React, { useState } from 'react';
import { DemoEvaluation, SimulationResult } from '@/lib/ai-demo/types';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Clock, Target, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

interface AIDemoDashboardProps {
  results: SimulationResult[];
  evaluation: DemoEvaluation;
  onClose?: () => void;
}

export default function AIDemoDashboard({ results, evaluation, onClose }: AIDemoDashboardProps) {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    agent: true,
    brief: true,
    recommendations: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getScoreColor = (score: number, outOf: number = 10): string => {
    const percentage = (score / outOf) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number, outOf: number = 10): string => {
    const percentage = (score / outOf) * 100;
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">AI Demo Results</h2>
              <p className="text-gray-300 text-sm">
                Simulated interviews with {results.length} personas completed
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Overall Score Card */}
          <div className={`rounded-xl p-6 ${evaluation.overallScore.readyToLaunch ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {evaluation.overallScore.readyToLaunch ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {evaluation.overallScore.readyToLaunch ? 'Ready to Launch! 🎉' : 'Needs Improvements'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {evaluation.overallScore.readyToLaunch 
                      ? 'Your AI agent and interview guide are performing well' 
                      : 'Review recommendations below before launching'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(evaluation.overallScore.agent)}`}>
                    {evaluation.overallScore.agent.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">Agent Score</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(evaluation.overallScore.brief)}`}>
                    {evaluation.overallScore.brief.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">Brief Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Performance Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('agent')}
              className="w-full px-6 py-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Agent Performance</h3>
              </div>
              {expandedSections.agent ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
            {expandedSections.agent && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    label="Question Coverage"
                    value={`${evaluation.agentMetrics.averageCoverageRate.toFixed(1)}%`}
                    icon={<Target className="w-5 h-5" />}
                    score={evaluation.agentMetrics.averageCoverageRate}
                    outOf={100}
                  />
                  <MetricCard
                    label="Avg Duration"
                    value={`${evaluation.agentMetrics.averageTime.toFixed(1)} min`}
                    icon={<Clock className="w-5 h-5" />}
                    neutral
                  />
                  <MetricCard
                    label="Adversarial Handling"
                    value={`${evaluation.agentMetrics.averageAdversarialScore.toFixed(1)}/10`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    score={evaluation.agentMetrics.averageAdversarialScore}
                  />
                  <MetricCard
                    label="Probing Quality"
                    value={`${evaluation.agentMetrics.averageProbingQuality.toFixed(1)}/10`}
                    icon={<MessageSquare className="w-5 h-5" />}
                    score={evaluation.agentMetrics.averageProbingQuality}
                  />
                </div>

                {/* Per-Persona Breakdown */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance by Persona</h4>
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={result.personaId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedPersona(result.personaId)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${result.completed ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="font-medium text-gray-900">
                            {result.personaId === 'ideal' ? 'Ideal Participant' : 
                             result.personaId === 'typical' ? 'Typical Participant' : 
                             'Difficult Participant'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{result.metrics.agent.coverageRate.toFixed(0)}% coverage</span>
                          <span>{result.duration.toFixed(1)} min</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Brief Quality Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('brief')}
              className="w-full px-6 py-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Interview Guide Quality</h3>
              </div>
              {expandedSections.brief ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
            {expandedSections.brief && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <MetricCard
                    label="Clarity Index"
                    value={`${evaluation.briefMetrics.averageClarityIndex.toFixed(1)}/10`}
                    icon={<CheckCircle className="w-5 h-5" />}
                    score={evaluation.briefMetrics.averageClarityIndex}
                  />
                  <MetricCard
                    label="Objective Coverage"
                    value={`${evaluation.briefMetrics.objectiveCoverage.toFixed(1)}%`}
                    icon={<Target className="w-5 h-5" />}
                    score={evaluation.briefMetrics.objectiveCoverage}
                    outOf={100}
                  />
                  <MetricCard
                    label="Length Accuracy"
                    value={evaluation.briefMetrics.lengthRealism.realistic ? 'Realistic' : 'Off Target'}
                    subValue={`${Math.abs(evaluation.briefMetrics.lengthRealism.variance).toFixed(0)}% variance`}
                    icon={<Clock className="w-5 h-5" />}
                    score={evaluation.briefMetrics.lengthRealism.realistic ? 10 : 5}
                  />
                </div>

                {/* High Risk Questions */}
                {evaluation.briefMetrics.highRiskQuestions.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      Questions Needing Attention ({evaluation.briefMetrics.highRiskQuestions.length})
                    </h4>
                    <div className="space-y-2">
                      {evaluation.briefMetrics.highRiskQuestions.slice(0, 3).map((q) => (
                        <div key={q.questionId} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">{q.question}</p>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${getScoreBgColor(q.clarityScore)} ${getScoreColor(q.clarityScore)}`}>
                              {q.clarityScore.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{q.issues[0]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full px-6 py-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Recommendations ({evaluation.recommendations.length})
                </h3>
              </div>
              {expandedSections.recommendations ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
            {expandedSections.recommendations && (
              <div className="p-6 space-y-3">
                {evaluation.recommendations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p>No recommendations - everything looks great!</p>
                  </div>
                ) : (
                  evaluation.recommendations.map((rec, index) => (
                    <RecommendationCard key={index} recommendation={rec} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={() => setSelectedPersona(results[0]?.personaId || null)}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            View Transcripts
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  label, 
  value, 
  subValue, 
  icon, 
  score, 
  outOf = 10, 
  neutral = false 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  icon: React.ReactNode; 
  score?: number; 
  outOf?: number; 
  neutral?: boolean;
}) {
  const getColor = () => {
    if (neutral || score === undefined) return 'text-gray-600';
    const percentage = (score / outOf) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2 text-gray-600">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${getColor()}`}>{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({ recommendation }: { recommendation: any }) {
  const getIcon = () => {
    switch (recommendation.type) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (recommendation.type) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getBgColor()}`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{recommendation.title}</h4>
          <p className="text-sm text-gray-700 mb-2">{recommendation.description}</p>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">
              <strong>Impact:</strong> {recommendation.impact}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Action:</strong> {recommendation.actionable}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

