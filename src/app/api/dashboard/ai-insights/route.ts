// app/api/dashboard/ai-insights/route.ts
// API endpoint for AI-powered insights

import { NextRequest, NextResponse } from "next/server";
import { conversationService } from "@/lib/conversation-service";
import { aiAnalysisService } from "@/lib/ai-analysis-service";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Starting AI insights analysis...');
    
    // Get recent conversations for analysis (limit to last 20 for performance)
    const conversations = await conversationService.fetchAllConversations();
    
    // Filter to only conversations with actual turns for meaningful analysis
    const conversationsWithTurns = conversations.filter(conv => 
      conv.conversation_data?.turns && 
      Array.isArray(conv.conversation_data.turns) && 
      conv.conversation_data.turns.length > 0
    );
    
    const recentConversations = conversationsWithTurns.slice(0, 20);
    
    console.log('✅ Got', recentConversations.length, 'conversations for AI analysis');

    if (recentConversations.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          churnRisk: [],
          pmfSignals: [],
          competitorInsights: [],
          hiddenNeeds: [],
          message: 'No conversations available for analysis'
        }
      });
    }

    // Perform AI analysis
    const analysis = await aiAnalysisService.analyzeConversationBatch(recentConversations);
    
    console.log('✅ AI analysis completed successfully');

    return NextResponse.json({
      success: true,
      data: {
        churnRisk: analysis.churnRisk,
        pmfSignals: analysis.pmfSignals,
        competitorInsights: analysis.competitorInsights,
        hiddenNeeds: analysis.hiddenNeeds,
        analyzedConversations: recentConversations.length
      }
    });

  } catch (error) {
    console.error('❌ Error in AI insights analysis:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze AI insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
