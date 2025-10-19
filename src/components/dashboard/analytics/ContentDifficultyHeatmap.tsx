// components/dashboard/analytics/ContentDifficultyHeatmap.tsx
// Content difficulty heatmap by user segment

import { ContentFeedback } from '@/lib/analytics-service';

interface ContentDifficultyHeatmapProps {
  contentFeedback: ContentFeedback[];
  loading?: boolean;
  error?: boolean;
}

export function ContentDifficultyHeatmap({ contentFeedback, loading, error }: ContentDifficultyHeatmapProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Difficulty Heatmap</h3>
        <div className="text-red-600">Failed to load content feedback data</div>
      </div>
    );
  }

  // Group feedback by user segment
  const segmentMap = new Map<string, ContentFeedback[]>();
  
  contentFeedback.forEach(feedback => {
    if (!segmentMap.has(feedback.user_segment)) {
      segmentMap.set(feedback.user_segment, []);
    }
    segmentMap.get(feedback.user_segment)!.push(feedback);
  });

  const getDifficultyColor = (difficulty: string, percentage: number) => {
    const baseColors = {
      'too_academic': 'bg-red-',
      'just_right': 'bg-green-',
      'too_basic': 'bg-blue-'
    };
    
    const colorIntensity = percentage > 50 ? '600' : percentage > 25 ? '400' : '200';
    return `${baseColors[difficulty as keyof typeof baseColors]}${colorIntensity}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Difficulty Heatmap</h3>
      
      {segmentMap.size > 0 ? (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-400 rounded mr-2"></div>
              <span>Too Academic</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-400 rounded mr-2"></div>
              <span>Just Right</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-400 rounded mr-2"></div>
              <span>Too Basic</span>
            </div>
          </div>
          
          {/* Heatmap */}
          <div className="grid grid-cols-1 gap-3">
            {Array.from(segmentMap.entries()).map(([segment, feedbacks]) => (
              <div key={segment} className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">{segment}</h4>
                
                <div className="grid grid-cols-3 gap-2">
                  {feedbacks.map((feedback, index) => (
                    <div key={index} className="text-center">
                      <div 
                        className={`h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium ${getDifficultyColor(feedback.difficulty_level, feedback.percentage)}`}
                      >
                        {feedback.percentage.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {feedback.difficulty_level.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {feedback.count} users
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-500">
          No content feedback data available
        </div>
      )}
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {contentFeedback.filter(f => f.difficulty_level === 'too_academic').reduce((sum, f) => sum + f.count, 0)}
            </div>
            <div className="text-gray-600">Too Academic</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {contentFeedback.filter(f => f.difficulty_level === 'just_right').reduce((sum, f) => sum + f.count, 0)}
            </div>
            <div className="text-gray-600">Just Right</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {contentFeedback.filter(f => f.difficulty_level === 'too_basic').reduce((sum, f) => sum + f.count, 0)}
            </div>
            <div className="text-gray-600">Too Basic</div>
          </div>
        </div>
      </div>
    </div>
  );
}
