// app/api/analytics/user-segments/route.ts
// API endpoint for user analytics and segmentation

import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/analytics-service';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Fetching user analytics data...');
    
    const analyticsService = new AnalyticsService();
    
    // Fetch all analytics data in parallel
    const [
      demographics,
      userSegments,
      contentFeedback,
      correlationInsights,
      powerUserProfiles,
      atRiskSegments,
      contentMarketFit,
      growthOpportunities
    ] = await Promise.all([
      analyticsService.extractDemographics(),
      analyticsService.analyzeUserSegments(),
      analyticsService.analyzeContentFeedback(),
      analyticsService.generateCorrelationInsights(),
      analyticsService.identifyPowerUserProfiles(),
      analyticsService.identifyAtRiskSegments(),
      analyticsService.analyzeContentMarketFit(),
      analyticsService.identifyGrowthOpportunities()
    ]);
    
    console.log('✅ User analytics data fetched successfully');
    
    return NextResponse.json({
      success: true,
      data: {
        demographics,
        userSegments,
        contentFeedback,
        correlationInsights,
        powerUserProfiles,
        atRiskSegments,
        contentMarketFit,
        growthOpportunities
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching user analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
