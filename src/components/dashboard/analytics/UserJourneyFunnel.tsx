// components/dashboard/analytics/UserJourneyFunnel.tsx
// User journey funnel visualization

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UserJourneyFunnelProps {
  journeyData: {
    stage: string;
    user_count: number;
    conversion_rate: number;
    drop_off_rate: number;
  }[];
  loading?: boolean;
  error?: boolean;
}

export function UserJourneyFunnel({ journeyData, loading, error }: UserJourneyFunnelProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Journey Funnel</h3>
        <div className="text-red-600">Failed to load journey data</div>
      </div>
    );
  }

  // Mock journey data if none provided
  const defaultJourneyData = [
    { stage: 'Started', user_count: 100, conversion_rate: 100, drop_off_rate: 0 },
    { stage: 'Engaged', user_count: 75, conversion_rate: 75, drop_off_rate: 25 },
    { stage: 'Completed', user_count: 60, conversion_rate: 60, drop_off_rate: 15 },
    { stage: 'Returned', user_count: 45, conversion_rate: 45, drop_off_rate: 15 }
  ];

  const data = journeyData.length > 0 ? journeyData : defaultJourneyData;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Journey Funnel</h3>
      
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="stage" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value} users`, 
                name === 'user_count' ? 'Users' : name === 'conversion_rate' ? 'Conversion Rate (%)' : 'Drop-off Rate (%)'
              ]}
              labelFormatter={(label) => `Stage: ${label}`}
            />
            <Bar dataKey="user_count" fill="#3B82F6" name="Users" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Journey stages breakdown */}
      <div className="space-y-3">
        {data.map((stage, index) => (
          <div key={stage.stage} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-gray-900">{stage.stage}</div>
                <div className="text-sm text-gray-600">
                  {stage.conversion_rate}% conversion rate
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">{stage.user_count}</div>
              <div className="text-sm text-gray-600">users</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Overall metrics */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {data[0]?.user_count || 0}
            </div>
            <div className="text-sm text-gray-600">Started</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {data[data.length - 1]?.user_count || 0}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {data[data.length - 1]?.conversion_rate || 0}%
            </div>
            <div className="text-sm text-gray-600">Overall Conversion</div>
          </div>
        </div>
      </div>
    </div>
  );
}
