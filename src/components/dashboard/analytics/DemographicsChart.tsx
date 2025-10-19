// components/dashboard/analytics/DemographicsChart.tsx
// Demographics pie chart component

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Demographics } from '@/lib/analytics-service';

interface DemographicsChartProps {
  demographics: Demographics[];
  type: 'age_group' | 'user_type' | 'experience_level' | 'primary_interest' | 'usage_frequency';
  title: string;
  loading?: boolean;
  error?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function DemographicsChart({ demographics, type, title, loading, error }: DemographicsChartProps) {
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-red-600">Failed to load demographics data</div>
      </div>
    );
  }

  // Process demographics data for the chart
  const dataMap = new Map<string, number>();
  
  demographics.forEach(demo => {
    const value = demo[type] || 'Unknown';
    dataMap.set(value, (dataMap.get(value) || 0) + 1);
  });

  const chartData = Array.from(dataMap.entries()).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length]
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value} users`, 'Count']}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No demographics data available
        </div>
      )}
      
      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Total Users:</span>
          <span className="ml-2 font-semibold text-gray-900">{total}</span>
        </div>
        <div>
          <span className="text-gray-600">Segments:</span>
          <span className="ml-2 font-semibold text-gray-900">{chartData.length}</span>
        </div>
      </div>
    </div>
  );
}
