// components/dashboard/analytics/ContentMarketFitCard.tsx
// Content-market fit analysis card

import { Target, TrendingUp, Users, Star } from 'lucide-react';
import { ContentMarketFit } from '@/lib/analytics-service';

interface ContentMarketFitCardProps {
  contentMarketFit: ContentMarketFit[];
  loading?: boolean;
  error?: boolean;
}

export function ContentMarketFitCard({ contentMarketFit, loading, error }: ContentMarketFitCardProps) {
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
          <Target className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Content-Market Fit</h3>
        </div>
        <div className="text-red-600">Failed to load content-market fit data</div>
      </div>
    );
  }

  if (contentMarketFit.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Target className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Content-Market Fit</h3>
        </div>
        <div className="text-gray-500 text-center py-8">
          No content-market fit data available
        </div>
      </div>
    );
  }

  const bestFit = contentMarketFit.reduce((best, current) => 
    current.content_value_score > best.content_value_score ? current : best
  );

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

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'too_academic': return '📚';
      case 'too_basic': return '🎯';
      default: return '✅';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Target className="h-5 w-5 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Content-Market Fit</h3>
      </div>

      {/* Best Fit User Type */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Star className="h-4 w-4 text-yellow-500 mr-2" />
          Best Content-Market Fit
        </h4>
        
        <div className={`border rounded-lg p-4 mb-4 ${getFitBgColor(bestFit.content_value_score)}`}>
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-semibold text-gray-900">{bestFit.user_type}</h5>
            <div className={`text-2xl font-bold ${getFitColor(bestFit.content_value_score)}`}>
              {bestFit.content_value_score}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Difficulty Perception:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {getDifficultyIcon(bestFit.difficulty_perception)} {bestFit.difficulty_perception.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Engagement Correlation:</span>
              <span className="ml-2 font-semibold text-gray-900">{bestFit.engagement_correlation}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Value Scores by User Type */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
          Content Value by User Type
        </h4>
        
        <div className="space-y-3">
          {contentMarketFit.map((fit, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                  {getDifficultyIcon(fit.difficulty_perception)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{fit.user_type}</div>
                  <div className="text-sm text-gray-600">
                    Difficulty: {fit.difficulty_perception.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold ${getFitColor(fit.content_value_score)}`}>
                  {fit.content_value_score}%
                </div>
                <div className="text-sm text-gray-600">value score</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Recommendations</h4>
        <div className="space-y-2">
          {bestFit.recommendations.map((recommendation, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <span className="text-sm text-blue-800">{recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="bg-gray-50 rounded p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Content Strategy</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Focus content development on {bestFit.user_type} segment</div>
          <div>• Adjust difficulty levels based on user feedback</div>
          <div>• Enhance engagement features for high-value segments</div>
          <div>• Test content variations for underserved segments</div>
        </div>
      </div>
    </div>
  );
}
