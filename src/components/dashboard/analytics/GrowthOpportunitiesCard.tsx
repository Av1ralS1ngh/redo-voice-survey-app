// components/dashboard/analytics/GrowthOpportunitiesCard.tsx
// Growth opportunities analysis card

import { TrendingUp, Users, Lightbulb, Target } from 'lucide-react';
import { GrowthOpportunity } from '@/lib/analytics-service';

interface GrowthOpportunitiesCardProps {
  growthOpportunities: GrowthOpportunity[];
  loading?: boolean;
  error?: boolean;
}

export function GrowthOpportunitiesCard({ growthOpportunities, loading, error }: GrowthOpportunitiesCardProps) {
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
          <TrendingUp className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Growth Opportunities</h3>
        </div>
        <div className="text-red-600">Failed to load growth opportunity data</div>
      </div>
    );
  }

  if (growthOpportunities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Growth Opportunities</h3>
        </div>
        <div className="text-gray-500 text-center py-8">
          No growth opportunities identified
        </div>
      </div>
    );
  }

  const topOpportunity = growthOpportunities.reduce((top, current) => 
    current.market_size_estimate > top.market_size_estimate ? current : top
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Growth Opportunities</h3>
      </div>

      {/* Top Opportunity */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Target className="h-4 w-4 text-green-500 mr-2" />
          Highest Potential Opportunity
        </h4>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-semibold text-green-900">{topOpportunity.segment_name}</h5>
            <div className="text-2xl font-bold text-green-600">
              {topOpportunity.market_size_estimate}
            </div>
          </div>
          
          <div className="text-sm text-green-800">
            Estimated market size: {topOpportunity.market_size_estimate} potential users
          </div>
        </div>
      </div>

      {/* Unmet Needs */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
          Unmet Needs
        </h4>
        <div className="space-y-2">
          {topOpportunity.unmet_needs.map((need, index) => (
            <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <span className="text-sm text-yellow-800">{need}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acquisition Strategy */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Users className="h-4 w-4 text-blue-500 mr-2" />
          Acquisition Strategy
        </h4>
        <div className="space-y-2">
          {topOpportunity.acquisition_strategy.map((strategy, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <span className="text-sm text-blue-800">{strategy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Recommendations */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Content Recommendations</h4>
        <div className="space-y-2">
          {topOpportunity.content_recommendations.map((recommendation, index) => (
            <div key={index} className="bg-purple-50 border border-purple-200 rounded p-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <span className="text-sm text-purple-800">{recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Opportunities Summary */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">All Growth Opportunities</h4>
        <div className="space-y-2">
          {growthOpportunities.map((opportunity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{opportunity.segment_name}</div>
                <div className="text-sm text-gray-600">
                  {opportunity.unmet_needs.length} unmet needs identified
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">{opportunity.market_size_estimate}</div>
                <div className="text-sm text-gray-600">potential users</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="bg-gray-50 rounded p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Growth Strategy</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Prioritize {topOpportunity.segment_name} segment for expansion</div>
          <div>• Develop content addressing unmet needs</div>
          <div>• Implement targeted acquisition campaigns</div>
          <div>• Test and iterate on growth strategies</div>
        </div>
      </div>
    </div>
  );
}
