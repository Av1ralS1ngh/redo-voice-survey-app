// components/dashboard/insights/HiddenNeedsCard.tsx
// AI-powered hidden needs and unspoken requirements analysis

import { Lightbulb, Brain, AlertCircle, Target, Zap } from 'lucide-react';
import { HiddenNeedsAnalysis } from '@/lib/ai-analysis-service';

interface HiddenNeedsCardProps {
  analysis: HiddenNeedsAnalysis[];
  loading?: boolean;
  error?: boolean;
}

export function HiddenNeedsCard({ analysis, loading, error }: HiddenNeedsCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center mb-4">
          <Lightbulb className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Hidden Needs Analysis</h3>
        </div>
        <div className="text-red-600">Failed to load hidden needs analysis</div>
      </div>
    );
  }

  // Aggregate hidden needs data
  const allUnspokenNeeds = analysis.flatMap(a => a.unspoken_needs);
  const uniqueUnspokenNeeds = [...new Set(allUnspokenNeeds)].slice(0, 4);

  const allUnderlyingProblems = analysis.flatMap(a => a.underlying_problems);
  const uniqueUnderlyingProblems = [...new Set(allUnderlyingProblems)].slice(0, 3);

  const allFeatureInsights = analysis.flatMap(a => a.feature_request_insights);
  const uniqueFeatureInsights = [...new Set(allFeatureInsights)].slice(0, 3);

  const allCognitiveLoadIndicators = analysis.flatMap(a => a.cognitive_load_indicators);
  const uniqueCognitiveLoadIndicators = [...new Set(allCognitiveLoadIndicators)].slice(0, 3);

  const allUsabilityPainPoints = analysis.flatMap(a => a.usability_pain_points);
  const uniqueUsabilityPainPoints = [...new Set(allUsabilityPainPoints)].slice(0, 3);

  const allLearningStylePreferences = analysis.flatMap(a => a.learning_style_preferences);
  const uniqueLearningStylePreferences = [...new Set(allLearningStylePreferences)].slice(0, 3);

  const allCommunicationPatterns = analysis.flatMap(a => a.communication_patterns);
  const uniqueCommunicationPatterns = [...new Set(allCommunicationPatterns)].slice(0, 3);

  const allHesitationIndicators = analysis.flatMap(a => a.hesitation_indicators);
  const uniqueHesitationIndicators = [...new Set(allHesitationIndicators)].slice(0, 3);

  // Calculate insights count
  const totalInsights = uniqueUnspokenNeeds.length + uniqueUnderlyingProblems.length + 
                       uniqueFeatureInsights.length + uniqueCognitiveLoadIndicators.length + 
                       uniqueUsabilityPainPoints.length;

  // Calculate confidence and sample size
  const avgConfidence = analysis.length > 0 
    ? Math.round(analysis.reduce((sum, a) => sum + a.confidence_score, 0) / analysis.length)
    : 0;
  const totalSampleSize = analysis.reduce((sum, a) => sum + a.sample_size, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Hidden Needs Analysis</h3>
        </div>
        <div className="text-2xl font-bold text-yellow-600">
          {totalInsights}
        </div>
      </div>

      {/* Unspoken Needs */}
      {uniqueUnspokenNeeds.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Target className="h-4 w-4 text-blue-500 mr-2" />
            Unspoken Needs
          </h4>
          <div className="space-y-2">
            {uniqueUnspokenNeeds.map((need, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-blue-800">{need}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Underlying Problems */}
      {uniqueUnderlyingProblems.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            Underlying Problems
          </h4>
          <div className="space-y-2">
            {uniqueUnderlyingProblems.map((problem, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{problem}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Request Insights */}
      {uniqueFeatureInsights.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Zap className="h-4 w-4 text-purple-500 mr-2" />
            Feature Request Insights
          </h4>
          <div className="space-y-2">
            {uniqueFeatureInsights.map((insight, index) => (
              <div key={index} className="bg-purple-50 border border-purple-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-purple-800">{insight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cognitive Load Indicators */}
      {uniqueCognitiveLoadIndicators.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Brain className="h-4 w-4 text-orange-500 mr-2" />
            Cognitive Load Indicators
          </h4>
          <div className="space-y-2">
            {uniqueCognitiveLoadIndicators.map((indicator, index) => (
              <div key={index} className="bg-orange-50 border border-orange-200 rounded p-3">
                <div className="flex items-start">
                  <Brain className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-800">{indicator}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usability Pain Points */}
      {uniqueUsabilityPainPoints.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            Usability Pain Points
          </h4>
          <div className="space-y-2">
            {uniqueUsabilityPainPoints.map((painPoint, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-red-800">{painPoint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Style Preferences */}
      {uniqueLearningStylePreferences.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Brain className="h-4 w-4 text-green-500 mr-2" />
            Learning Style Preferences
          </h4>
          <div className="space-y-2">
            {uniqueLearningStylePreferences.map((preference, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-green-800">{preference}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication Patterns */}
      {uniqueCommunicationPatterns.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Zap className="h-4 w-4 text-indigo-500 mr-2" />
            Communication Patterns
          </h4>
          <div className="space-y-2">
            {uniqueCommunicationPatterns.map((pattern, index) => (
              <div key={index} className="bg-indigo-50 border border-indigo-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-indigo-800">{pattern}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hesitation Indicators */}
      {uniqueHesitationIndicators.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
            Hesitation Indicators
          </h4>
          <div className="space-y-2">
            {uniqueHesitationIndicators.map((indicator, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">{indicator}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistical Significance */}
      <div className="mb-4 bg-gray-50 rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Analysis Confidence</h4>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Confidence: <span className="font-semibold text-blue-600">{avgConfidence}%</span></span>
            <span>Sample: <span className="font-semibold text-green-600">{totalSampleSize} conversations</span></span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${avgConfidence}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
