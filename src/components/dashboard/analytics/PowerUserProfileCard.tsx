// components/dashboard/analytics/PowerUserProfileCard.tsx
// Power user profile analysis card

import { Crown, TrendingUp, Users, Star } from 'lucide-react';
import { PowerUserProfile } from '@/lib/analytics-service';

interface PowerUserProfileCardProps {
  powerUsers: PowerUserProfile[];
  loading?: boolean;
  error?: boolean;
}

export function PowerUserProfileCard({ powerUsers, loading, error }: PowerUserProfileCardProps) {
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
          <Crown className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Power User Profile</h3>
        </div>
        <div className="text-red-600">Failed to load power user data</div>
      </div>
    );
  }

  if (powerUsers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Crown className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Power User Profile</h3>
        </div>
        <div className="text-gray-500 text-center py-8">
          No power users identified yet
        </div>
      </div>
    );
  }

  const topPowerUser = powerUsers[0]; // Get the top power user

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Crown className="h-5 w-5 text-yellow-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Power User Profile</h3>
      </div>

      {/* Power User Characteristics */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Star className="h-4 w-4 text-yellow-500 mr-2" />
          Top Power User Characteristics
        </h4>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">User Type:</span>
              <span className="ml-2 font-semibold text-gray-900">{topPowerUser.demographics.user_type}</span>
            </div>
            <div>
              <span className="text-gray-600">Age Group:</span>
              <span className="ml-2 font-semibold text-gray-900">{topPowerUser.demographics.age_group}</span>
            </div>
            <div>
              <span className="text-gray-600">Experience:</span>
              <span className="ml-2 font-semibold text-gray-900">{topPowerUser.demographics.experience_level}</span>
            </div>
            <div>
              <span className="text-gray-600">Interest:</span>
              <span className="ml-2 font-semibold text-gray-900">{topPowerUser.demographics.primary_interest}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{topPowerUser.engagement_score}%</div>
          <div className="text-sm text-blue-800">Engagement Score</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{topPowerUser.retention_rate}%</div>
          <div className="text-sm text-green-800">Retention Rate</div>
        </div>
      </div>

      {/* Characteristics List */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Key Characteristics</h4>
        <div className="space-y-2">
          {topPowerUser.characteristics.map((characteristic, index) => (
            <div key={index} className="flex items-center text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 flex-shrink-0"></div>
              <span className="text-gray-700">{characteristic}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Adoption */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
          Feature Adoption
        </h4>
        <div className="space-y-2">
          {topPowerUser.feature_adoption.map((feature, index) => (
            <div key={index} className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span className="text-sm text-green-800">{feature}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="bg-gray-50 rounded p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Actionable Insights</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Target similar demographics for user acquisition</div>
          <div>• Replicate successful engagement patterns</div>
          <div>• Develop features that power users value most</div>
          <div>• Create power user referral programs</div>
        </div>
      </div>
    </div>
  );
}
