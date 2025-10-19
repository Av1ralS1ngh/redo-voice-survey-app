// app/api/export/insights/route.ts
// API endpoint for exporting AI insights

import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/lib/conversation-service';
import { PDFExportService } from '@/lib/pdf-export-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'executive';
    
    console.log('📊 Generating insights export...');
    
    // Get conversation metrics
    const metrics = await conversationService.getConversationMetrics();
    const recentActivity = await conversationService.getRecentActivity();
    
    // Get AI insights (we'll use a simplified version for export)
    const conversations = await conversationService.fetchAllConversations();
    const conversationsWithTurns = conversations.filter(conv => 
      conv.conversation_data?.turns && 
      Array.isArray(conv.conversation_data.turns) && 
      conv.conversation_data.turns.length > 0
    );
    
    // Create mock AI insights data for export (in a real implementation, you'd fetch from the AI analysis)
    const exportData = {
      churnRisk: [
        {
          risk_score: 65,
          risk_level: 'medium',
          behavioral_indicators: ['Hesitation patterns', 'Politeness without enthusiasm'],
          specific_quotes: ['"Um, I guess it\'s fine"', '"It\'s okay, I suppose"'],
          recommendations: ['Engage with more personalized questions', 'Address specific concerns'],
          confidence_score: 85,
          sample_size: conversationsWithTurns.length
        }
      ],
      pmfSignals: [
        {
          fit_score: 50,
          excitement_level: 'medium',
          genuine_enthusiasm: false,
          unprompted_positive_mentions: [],
          compliance_signals: ['"It\'s good"', '"I guess it\'s helpful"'],
          market_signals: ['Interest in task management tools'],
          confidence_score: 80,
          sample_size: conversationsWithTurns.length
        }
      ],
      competitorInsights: [
        {
          mentioned_competitors: [],
          comparison_points: [],
          user_expectations: [],
          competitive_advantages: [],
          threats: [],
          indirect_comparisons: [],
          positioning_insights: [],
          mental_model_indicators: [],
          confidence_score: 75,
          sample_size: conversationsWithTurns.length
        }
      ],
      hiddenNeeds: [
        {
          unspoken_needs: ['Clearer understanding of app features', 'More guidance on usage'],
          underlying_problems: ['Navigation difficulties', 'Uncertainty about benefits'],
          feature_request_insights: ['Need for better onboarding'],
          cognitive_load_indicators: ['Confusion about interface'],
          usability_pain_points: ['Finding features'],
          learning_style_preferences: ['Visual learning preferred'],
          communication_patterns: ['Prefers step-by-step guidance'],
          hesitation_indicators: ['Frequent pauses', 'Uncertain responses'],
          confidence_score: 82,
          sample_size: conversationsWithTurns.length
        }
      ],
      metrics: {
        total_conversations: metrics.total_conversations,
        completion_rate: metrics.completion_rate,
        unique_users: metrics.unique_users,
        average_duration: metrics.average_duration
      },
      generatedAt: new Date().toISOString()
    };
    
    const pdfService = new PDFExportService();
    
    let content: string;
    let contentType: string;
    let filename: string;
    
    switch (format) {
      case 'executive':
        content = pdfService.generateExecutiveSummary(exportData);
        contentType = 'text/plain';
        filename = `executive-summary-${new Date().toISOString().split('T')[0]}.txt`;
        break;
      case 'detailed':
        content = pdfService.generateDetailedReport(exportData);
        contentType = 'text/plain';
        filename = `detailed-insights-report-${new Date().toISOString().split('T')[0]}.txt`;
        break;
      case 'json':
        content = pdfService.exportAsJSON(exportData);
        contentType = 'application/json';
        filename = `ai-insights-data-${new Date().toISOString().split('T')[0]}.json`;
        break;
      default:
        content = pdfService.generateExecutiveSummary(exportData);
        contentType = 'text/plain';
        filename = `executive-summary-${new Date().toISOString().split('T')[0]}.txt`;
    }
    
    console.log('✅ Export generated successfully');
    
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
