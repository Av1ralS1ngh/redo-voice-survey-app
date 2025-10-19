// components/dashboard/insights/CompetitorInsightsCard.tsx
// AI-powered competitive intelligence analysis

import { Search, Shield, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { CompetitorInsights } from '@/lib/ai-analysis-service';

interface CompetitorInsightsCardProps {
  analysis: CompetitorInsights[];
  loading?: boolean;
  error?: boolean;
}

export function CompetitorInsightsCard({ analysis, loading, error }: CompetitorInsightsCardProps) {
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
          <Search className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Competitor Insights</h3>
        </div>
        <div className="text-red-600">Failed to load competitor analysis</div>
      </div>
    );
  }

  // Aggregate competitor data
  const allCompetitors = analysis.flatMap(a => a.mentioned_competitors);
  const competitorCounts = allCompetitors.reduce((acc, competitor) => {
    acc[competitor] = (acc[competitor] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCompetitors = Object.entries(competitorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([competitor, count]) => ({ competitor, count }));

  const allComparisonPoints = analysis.flatMap(a => a.comparison_points);
  const uniqueComparisonPoints = [...new Set(allComparisonPoints)].slice(0, 4);

  const allUserExpectations = analysis.flatMap(a => a.user_expectations);
  const uniqueUserExpectations = [...new Set(allUserExpectations)].slice(0, 3);

  const allAdvantages = analysis.flatMap(a => a.competitive_advantages);
  const uniqueAdvantages = [...new Set(allAdvantages)].slice(0, 3);

  const allThreats = analysis.flatMap(a => a.threats);
  const uniqueThreats = [...new Set(allThreats)].slice(0, 3);

  const allIndirectComparisons = analysis.flatMap(a => a.indirect_comparisons);
  const uniqueIndirectComparisons = [...new Set(allIndirectComparisons)].slice(0, 3);

  const allPositioningInsights = analysis.flatMap(a => a.positioning_insights);
  const uniquePositioningInsights = [...new Set(allPositioningInsights)].slice(0, 3);

  const allMentalModelIndicators = analysis.flatMap(a => a.mental_model_indicators);
  const uniqueMentalModelIndicators = [...new Set(allMentalModelIndicators)].slice(0, 3);

  // Calculate confidence and sample size
  const avgConfidence = analysis.length > 0 
    ? Math.round(analysis.reduce((sum, a) => sum + a.confidence_score, 0) / analysis.length)
    : 0;
  const totalSampleSize = analysis.reduce((sum, a) => sum + a.sample_size, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Search className="h-5 w-5 text-purple-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Competitor Insights</h3>
      </div>

      {/* Top Competitors Mentioned */}
      {topCompetitors.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Users className="h-4 w-4 text-blue-500 mr-2" />
            Most Mentioned Competitors
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {topCompetitors.map(({ competitor, count }, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                <div className="text-lg font-bold text-blue-600">{count}</div>
                <div className="text-sm text-blue-800">{competitor}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Points */}
      {uniqueComparisonPoints.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
            Key Comparison Points
          </h4>
          <div className="space-y-2">
            {uniqueComparisonPoints.map((point, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-green-800">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Expectations */}
      {uniqueUserExpectations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Shield className="h-4 w-4 text-purple-500 mr-2" />
            User Expectations (Based on Competitors)
          </h4>
          <div className="space-y-2">
            {uniqueUserExpectations.map((expectation, index) => (
              <div key={index} className="bg-purple-50 border border-purple-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-purple-800">{expectation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Advantages */}
      {uniqueAdvantages.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
            Competitive Advantages Mentioned
          </h4>
          <div className="space-y-2">
            {uniqueAdvantages.map((advantage, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-green-800">{advantage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Threats */}
      {uniqueThreats.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
            Competitive Threats Identified
          </h4>
          <div className="space-y-2">
            {uniqueThreats.map((threat, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{threat}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indirect Comparisons */}
      {uniqueIndirectComparisons.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 text-orange-500 mr-2" />
            Indirect Comparisons
          </h4>
          <div className="space-y-2">
            {uniqueIndirectComparisons.map((comparison, index) => (
              <div key={index} className="bg-orange-50 border border-orange-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-orange-800">{comparison}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positioning Insights */}
      {uniquePositioningInsights.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Shield className="h-4 w-4 text-indigo-500 mr-2" />
            Positioning Insights
          </h4>
          <div className="space-y-2">
            {uniquePositioningInsights.map((insight, index) => (
              <div key={index} className="bg-indigo-50 border border-indigo-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-indigo-800">{insight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mental Model Indicators */}
      {uniqueMentalModelIndicators.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Users className="h-4 w-4 text-teal-500 mr-2" />
            Mental Model Indicators
          </h4>
          <div className="space-y-2">
            {uniqueMentalModelIndicators.map((indicator, index) => (
              <div key={index} className="bg-teal-50 border border-teal-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-teal-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-teal-800">{indicator}</p>
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
