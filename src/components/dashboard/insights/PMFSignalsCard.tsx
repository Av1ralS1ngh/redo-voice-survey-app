// components/dashboard/insights/PMFSignalsCard.tsx
// AI-powered product-market fit signals analysis

import { Target, Heart, TrendingUp, Users, Star } from 'lucide-react';
import { PMFAnalysis } from '@/lib/ai-analysis-service';

interface PMFSignalsCardProps {
  analysis: PMFAnalysis[];
  loading?: boolean;
  error?: boolean;
}

export function PMFSignalsCard({ analysis, loading, error }: PMFSignalsCardProps) {
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
          <Target className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Product-Market Fit Signals</h3>
        </div>
        <div className="text-red-600">Failed to load PMF analysis</div>
      </div>
    );
  }

  // Calculate aggregated metrics
  const avgFitScore = analysis.length > 0 
    ? Math.round(analysis.reduce((sum, a) => sum + a.fit_score, 0) / analysis.length)
    : 0;
  
  const genuineEnthusiasmCount = analysis.filter(a => a.genuine_enthusiasm).length;
  const highExcitementCount = analysis.filter(a => a.excitement_level === 'high').length;
  
  // Collect all unprompted positive mentions
  const allPositiveMentions = analysis.flatMap(a => a.unprompted_positive_mentions);
  const uniquePositiveMentions = [...new Set(allPositiveMentions)].slice(0, 3);

  // Collect market signals
  const allMarketSignals = analysis.flatMap(a => a.market_signals);
  const uniqueMarketSignals = [...new Set(allMarketSignals)].slice(0, 3);

  // Collect compliance signals
  const allComplianceSignals = analysis.flatMap(a => a.compliance_signals);
  const uniqueComplianceSignals = [...new Set(allComplianceSignals)].slice(0, 2);

  const getFitColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFitBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-50 border-green-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // Calculate confidence and sample size
  const avgConfidence = analysis.length > 0 
    ? Math.round(analysis.reduce((sum, a) => sum + a.confidence_score, 0) / analysis.length)
    : 0;
  const totalSampleSize = analysis.reduce((sum, a) => sum + a.sample_size, 0);

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${getFitBgColor(avgFitScore)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Target className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Product-Market Fit Signals</h3>
        </div>
        <div className={`text-2xl font-bold ${getFitColor(avgFitScore)}`}>
          {avgFitScore}%
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{genuineEnthusiasmCount}</div>
          <div className="text-sm text-gray-600">Genuine Enthusiasm</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{highExcitementCount}</div>
          <div className="text-sm text-gray-600">High Excitement</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{uniquePositiveMentions.length}</div>
          <div className="text-sm text-gray-600">Positive Signals</div>
        </div>
      </div>

      {/* Unprompted Positive Mentions */}
      {uniquePositiveMentions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Heart className="h-4 w-4 text-red-500 mr-2" />
            Unprompted Positive Mentions
          </h4>
          <div className="space-y-2">
            {uniquePositiveMentions.map((mention, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-start">
                  <Star className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800">"{mention}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Signals */}
      {uniqueMarketSignals.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
            Market Demand Signals
          </h4>
          <div className="space-y-2">
            {uniqueMarketSignals.map((signal, index) => (
              <div key={index} className="flex items-start text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">{signal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Signals (Warning) */}
      {uniqueComplianceSignals.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Users className="h-4 w-4 text-yellow-500 mr-2" />
            Compliance Signals (Monitor)
          </h4>
          <div className="space-y-2">
            {uniqueComplianceSignals.map((signal, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-yellow-800">{signal}</p>
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
