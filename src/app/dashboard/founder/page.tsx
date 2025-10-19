// app/dashboard/founder/page.tsx
// Founder dashboard with conversation analytics and metrics

'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  Brain,
  Download,
  FileText,
  PieChart,
  Target,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { 
  ConversationMetrics, 
  RecentActivity 
} from '@/lib/conversation-service';
import { ChurnRiskCard } from '@/components/dashboard/insights/ChurnRiskCard';
import { PMFSignalsCard } from '@/components/dashboard/insights/PMFSignalsCard';
import { CompetitorInsightsCard } from '@/components/dashboard/insights/CompetitorInsightsCard';
import { HiddenNeedsCard } from '@/components/dashboard/insights/HiddenNeedsCard';
import { 
  ChurnRiskAnalysis, 
  PMFAnalysis, 
  CompetitorInsights, 
  HiddenNeedsAnalysis 
} from '@/lib/ai-analysis-service';
import { DemographicsChart } from '@/components/dashboard/analytics/DemographicsChart';
import { ContentDifficultyHeatmap } from '@/components/dashboard/analytics/ContentDifficultyHeatmap';
import { UserJourneyFunnel } from '@/components/dashboard/analytics/UserJourneyFunnel';
import { PowerUserProfileCard } from '@/components/dashboard/analytics/PowerUserProfileCard';
import { AtRiskSegmentsCard } from '@/components/dashboard/analytics/AtRiskSegmentsCard';
import { ContentMarketFitCard } from '@/components/dashboard/analytics/ContentMarketFitCard';
import { GrowthOpportunitiesCard } from '@/components/dashboard/analytics/GrowthOpportunitiesCard';

export default function FounderDashboard() {
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [aiInsights, setAiInsights] = useState<{
    churnRisk: ChurnRiskAnalysis[];
    pmfSignals: PMFAnalysis[];
    competitorInsights: CompetitorInsights[];
    hiddenNeeds: HiddenNeedsAnalysis[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // User Analytics state
  const [userAnalytics, setUserAnalytics] = useState<{
    demographics: any[];
    userSegments: any[];
    contentFeedback: any[];
    correlationInsights: any[];
    powerUserProfiles: any[];
    atRiskSegments: any[];
    contentMarketFit: any[];
    growthOpportunities: any[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadAiInsights();
    loadUserAnalytics();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load dashboard data');
      }

      setMetrics(data.data.metrics);
      setRecentActivity(data.data.recentActivity);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAiInsights = async () => {
    try {
      setAiLoading(true);
      setAiError(null);

      const response = await fetch('/api/dashboard/ai-insights');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load AI insights');
      }

      setAiInsights(data.data);
    } catch (err) {
      console.error('Error loading AI insights:', err);
      setAiError('Failed to load AI insights');
    } finally {
      setAiLoading(false);
    }
  };

  const loadUserAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      
      const response = await fetch('/api/analytics/user-segments');
      if (!response.ok) {
        throw new Error(`Analytics API failed: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setUserAnalytics(result.data);
      } else {
        throw new Error(result.error || 'Failed to load user analytics');
      }
    } catch (error) {
      console.error('Error loading user analytics:', error);
      setAnalyticsError('Failed to load user analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const refreshData = () => {
    loadDashboardData();
    loadAiInsights();
    loadUserAnalytics();
  };

  const exportInsights = async (format: 'executive' | 'detailed' | 'json') => {
    try {
      const response = await fetch(`/api/export/insights?format=${format}`);
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `insights-${format}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Founder Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Voice Survey Analytics & Insights
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Refresh
              </button>
              
              {/* Future navigation placeholder */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Personas:</span>
                <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Founder
                </button>
                <button className="px-3 py-1 text-gray-400 rounded-full text-xs font-medium hover:text-gray-600">
                  Product
                </button>
                <button className="px-3 py-1 text-gray-400 rounded-full text-xs font-medium hover:text-gray-600">
                  Marketing
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 text-red-400">⚠️</div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-4">
                  <button
                    onClick={refreshData}
                    className="text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Try again →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Conversations"
            value={metrics?.total_conversations || 0}
            subtitle="All time"
            icon={MessageSquare}
            loading={loading}
            error={!!error}
          />
          
          <MetricCard
            title="Completion Rate"
            value={`${metrics?.completion_rate || 0}%`}
            subtitle={`${metrics?.completed_conversations || 0} completed`}
            icon={CheckCircle}
            loading={loading}
            error={!!error}
          />
          
          <MetricCard
            title="Unique Users"
            value={metrics?.unique_users || 0}
            subtitle="Total participants"
            icon={Users}
            loading={loading}
            error={!!error}
          />
          
          <MetricCard
            title="Avg Duration"
            value={`${Math.round((metrics?.average_duration || 0) / 60)}m`}
            subtitle={`${metrics?.average_turns || 0} avg turns`}
            icon={Clock}
            loading={loading}
            error={!!error}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ActivityChart
            data={recentActivity?.daily_activity || []}
            loading={loading}
            error={!!error}
            chartType="bar"
            title="Daily Activity (Last 30 Days)"
          />
          
          <ActivityChart
            data={recentActivity?.daily_activity || []}
            loading={loading}
            error={!!error}
            chartType="line"
            title="Activity Trend"
          />
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity Summary</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          
          {loading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">
              Failed to load recent activity
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {recentActivity?.weekly_summary.conversations || 0}
                </div>
                <div className="text-sm text-gray-600">Conversations (7 days)</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {recentActivity?.weekly_summary.completion_rate || 0}%
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {recentActivity?.weekly_summary.new_users || 0}
                </div>
                <div className="text-sm text-gray-600">New Users</div>
              </div>
            </div>
          )}
        </div>

        {/* AI-Powered Insights */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Powered Insights</h2>
              <p className="text-sm text-gray-600 mt-1">
                Deep analysis of conversation patterns and user behavior
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadAiInsights}
                disabled={aiLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Brain className="h-4 w-4 mr-2" />
                {aiLoading ? 'Analyzing...' : 'Analyze Conversations'}
              </button>
              
              {/* Export Dropdown */}
              <div className="relative">
                <button
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="py-1">
                    <button
                      onClick={() => exportInsights('executive')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Executive Summary
                    </button>
                    <button
                      onClick={() => exportInsights('detailed')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Detailed Report
                    </button>
                    <button
                      onClick={() => exportInsights('json')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Raw Data (JSON)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {aiError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="h-5 w-5 text-red-400">⚠️</div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">AI Analysis Error</h3>
                  <div className="mt-2 text-sm text-red-700">{aiError}</div>
                  <div className="mt-4">
                    <button
                      onClick={loadAiInsights}
                      className="text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      Try again →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChurnRiskCard 
              analysis={aiInsights?.churnRisk || []} 
              loading={aiLoading} 
              error={!!aiError} 
            />
            <PMFSignalsCard 
              analysis={aiInsights?.pmfSignals || []} 
              loading={aiLoading} 
              error={!!aiError} 
            />
            <CompetitorInsightsCard 
              analysis={aiInsights?.competitorInsights || []} 
              loading={aiLoading} 
              error={!!aiError} 
            />
            <HiddenNeedsCard 
              analysis={aiInsights?.hiddenNeeds || []} 
              loading={aiLoading} 
              error={!!aiError} 
            />
          </div>
        </div>

        {/* User Analytics & Segmentation */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">User Analytics & Segmentation</h2>
              <p className="text-sm text-gray-600 mt-1">
                Demographic analysis, user segmentation, and growth opportunities
              </p>
            </div>
            <button
              onClick={loadUserAnalytics}
              disabled={analyticsLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <PieChart className="h-4 w-4 mr-2" />
              {analyticsLoading ? 'Analyzing...' : 'Refresh Analytics'}
            </button>
          </div>

          {analyticsError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Analytics Error</h3>
                  <div className="mt-2 text-sm text-red-700">{analyticsError}</div>
                </div>
              </div>
            </div>
          )}

          {/* Demographics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <DemographicsChart
              demographics={userAnalytics?.demographics || []}
              type="user_type"
              title="User Types"
              loading={analyticsLoading}
              error={!!analyticsError}
            />
            <DemographicsChart
              demographics={userAnalytics?.demographics || []}
              type="age_group"
              title="Age Groups"
              loading={analyticsLoading}
              error={!!analyticsError}
            />
          </div>

          {/* Content Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ContentDifficultyHeatmap
              contentFeedback={userAnalytics?.contentFeedback || []}
              loading={analyticsLoading}
              error={!!analyticsError}
            />
            <UserJourneyFunnel
              journeyData={[]} // Mock data for now
              loading={analyticsLoading}
              error={!!analyticsError}
            />
          </div>

          {/* Actionable Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PowerUserProfileCard
              powerUsers={userAnalytics?.powerUserProfiles || []}
              loading={analyticsLoading}
              error={!!analyticsError}
            />
            <AtRiskSegmentsCard
              atRiskSegments={userAnalytics?.atRiskSegments || []}
              loading={analyticsLoading}
              error={!!analyticsError}
            />
            <ContentMarketFitCard
              contentMarketFit={userAnalytics?.contentMarketFit || []}
              loading={analyticsLoading}
              error={!!analyticsError}
            />
            <GrowthOpportunitiesCard
              growthOpportunities={userAnalytics?.growthOpportunities || []}
              loading={analyticsLoading}
              error={!!analyticsError}
            />
          </div>
        </div>

        {/* Future Features Placeholder */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Coming Soon</h3>
            <Settings className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg text-center">
              <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-600">Advanced Analytics</div>
              <div className="text-xs text-gray-500">Detailed insights & trends</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg text-center">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-600">User Segmentation</div>
              <div className="text-xs text-gray-500">Demographic analysis</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg text-center">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-600">Sentiment Analysis</div>
              <div className="text-xs text-gray-500">Emotion tracking</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg text-center">
              <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-600">Predictive Metrics</div>
              <div className="text-xs text-gray-500">Forecasting & trends</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
