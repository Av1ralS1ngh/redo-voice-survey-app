// components/dashboard/analytics/AtRiskSegmentsCard.tsx
// At-risk segments analysis card

import { AlertTriangle, Users, TrendingDown, Shield } from 'lucide-react';
import { AtRiskSegment } from '@/lib/analytics-service';

interface AtRiskSegmentsCardProps {
  atRiskSegments: AtRiskSegment[];
  loading?: boolean;
  error?: boolean;
}

export function AtRiskSegmentsCard({ atRiskSegments, loading, error }: AtRiskSegmentsCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
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
          <h3 className="text-lg font-semibold text-gray-900">At-Risk Segments</h3>
        </div>
        <div className="text-red-600">Failed to load at-risk segment data</div>
      </div>
    );
  }

  if (atRiskSegments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-5 w-5 text-green-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">At-Risk Segments</h3>
        </div>
        <div className="text-green-600 text-center py-8">
          ✅ No at-risk segments identified - all users are healthy!
        </div>
      </div>
    );
  }

  const highestRiskSegment = atRiskSegments.reduce((highest, current) => 
    current.churn_probability > highest.churn_probability ? current : highest
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">At-Risk Segments</h3>
      </div>

      {/* Highest Risk Segment */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
          Highest Risk Segment
        </h4>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-semibold text-red-900">{highestRiskSegment.segment_name}</h5>
            <div className="text-2xl font-bold text-red-600">
              {highestRiskSegment.churn_probability}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">User Type:</span>
              <span className="ml-2 font-semibold text-gray-900">{highestRiskSegment.demographics.user_type}</span>
            </div>
            <div>
              <span className="text-gray-600">Age Group:</span>
              <span className="ml-2 font-semibold text-gray-900">{highestRiskSegment.demographics.age_group}</span>
            </div>
            <div>
              <span className="text-gray-600">Experience:</span>
              <span className="ml-2 font-semibold text-gray-900">{highestRiskSegment.demographics.experience_level}</span>
            </div>
            <div>
              <span className="text-gray-600">Interest:</span>
              <span className="ml-2 font-semibold text-gray-900">{highestRiskSegment.demographics.primary_interest}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Indicators</h4>
        <div className="space-y-2">
          {highestRiskSegment.risk_indicators.map((indicator, index) => (
            <div key={index} className="flex items-center text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
              <span className="text-red-700">{indicator}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Intervention Strategies */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Shield className="h-4 w-4 text-blue-500 mr-2" />
          Intervention Strategies
        </h4>
        <div className="space-y-2">
          {highestRiskSegment.intervention_strategies.map((strategy, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <span className="text-sm text-blue-800">{strategy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All At-Risk Segments Summary */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">All At-Risk Segments</h4>
        <div className="space-y-2">
          {atRiskSegments.map((segment, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{segment.segment_name}</div>
                <div className="text-sm text-gray-600">
                  {segment.demographics.user_type} • {segment.demographics.age_group}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-red-600">{segment.churn_probability}%</div>
                <div className="text-sm text-gray-600">churn risk</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="bg-gray-50 rounded p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Immediate Actions</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Implement targeted retention campaigns</div>
          <div>• Address specific pain points for at-risk segments</div>
          <div>• Provide additional support resources</div>
          <div>• Monitor engagement metrics closely</div>
        </div>
      </div>
    </div>
  );
}
