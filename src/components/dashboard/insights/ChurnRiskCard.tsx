// components/dashboard/insights/ChurnRiskCard.tsx
// AI-powered churn risk analysis card

import { AlertTriangle, Users, TrendingDown, MessageSquare } from 'lucide-react';
import { ChurnRiskAnalysis } from '@/lib/ai-analysis-service';

interface ChurnRiskCardProps {
  analysis: ChurnRiskAnalysis[];
  loading?: boolean;
  error?: boolean;
}

export function ChurnRiskCard({ analysis, loading, error }: ChurnRiskCardProps) {
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
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Churn Risk Analysis</h3>
        </div>
        <div className="text-red-600">Failed to load churn risk data</div>
      </div>
    );
  }

  // Calculate aggregated metrics
  const highRiskUsers = analysis.filter(a => a.risk_level === 'high').length;
  const mediumRiskUsers = analysis.filter(a => a.risk_level === 'medium').length;
  const avgRiskScore = analysis.length > 0 
    ? Math.round(analysis.reduce((sum, a) => sum + a.risk_score, 0) / analysis.length)
    : 0;

  // Get top risk indicators
  const allIndicators = analysis.flatMap(a => a.behavioral_indicators);
  const indicatorCounts = allIndicators.reduce((acc, indicator) => {
    acc[indicator] = (acc[indicator] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topIndicators = Object.entries(indicatorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([indicator, count]) => ({ indicator, count }));

  // Get specific quotes from high-risk users
  const highRiskQuotes = analysis
    .filter(a => a.risk_level === 'high')
    .flatMap(a => a.specific_quotes)
    .slice(0, 2);

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBgColor = (score: number) => {
    if (score >= 70) return 'bg-red-50 border-red-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  // Calculate confidence and sample size
  const avgConfidence = analysis.length > 0 
    ? Math.round(analysis.reduce((sum, a) => sum + a.confidence_score, 0) / analysis.length)
    : 0;
  const totalSampleSize = analysis.reduce((sum, a) => sum + a.sample_size, 0);

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${getRiskBgColor(avgRiskScore)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Churn Risk Analysis</h3>
        </div>
        <div className={`text-2xl font-bold ${getRiskColor(avgRiskScore)}`}>
          {avgRiskScore}%
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{highRiskUsers}</div>
          <div className="text-sm text-gray-600">High Risk</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{mediumRiskUsers}</div>
          <div className="text-sm text-gray-600">Medium Risk</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {analysis.length - highRiskUsers - mediumRiskUsers}
          </div>
          <div className="text-sm text-gray-600">Low Risk</div>
        </div>
      </div>

      {/* Top Risk Indicators */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Top Risk Indicators</h4>
        <div className="space-y-2">
          {topIndicators.map(({ indicator, count }, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{indicator}</span>
              <span className="text-gray-500">{count} users</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Quotes */}
      {highRiskQuotes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Warning Signs</h4>
          <div className="space-y-2">
            {highRiskQuotes.map((quote, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-start">
                  <MessageSquare className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800 italic">"{quote}"</p>
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
