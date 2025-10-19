// app/api/test-ai/route.ts
// Test endpoint for AI analysis service

import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '@/lib/ai-analysis-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing AI analysis service...');
    
    const aiService = new AIAnalysisService();
    
    // Test OpenAI connection
    const connectionTest = await aiService.testConnection();
    
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI connection failed',
        details: 'Check OPENAI_API_KEY environment variable'
      }, { status: 500 });
    }
    
    // Test with sample conversation data
    const sampleConversation = {
      id: 'test-001',
      user_name: 'Test User',
      conversation_data: {
        turns: [
          {
            speaker: 'user' as const,
            message: 'Hello, I\'m interested in your product',
            timestamp: '2024-01-01T10:00:00Z',
            turn_number: 1
          },
          {
            speaker: 'agent' as const,
            message: 'Great! Can you tell me more about what you\'re looking for?',
            timestamp: '2024-01-01T10:00:05Z',
            turn_number: 2
          },
          {
            speaker: 'user' as const,
            message: 'Um, I guess it\'s fine. It\'s okay, I suppose.',
            timestamp: '2024-01-01T10:00:10Z',
            turn_number: 3
          }
        ],
        metrics: {
          user_turns: 2,
          agent_turns: 1,
          total_turns: 3,
          duration_seconds: 10,
          completion_status: 'completed'
        },
        survey_responses: {}
      },
      status: 'completed',
      started_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-01T10:00:10Z'
    };
    
    // Test churn risk analysis
    const churnAnalysis = await aiService.analyzeChurnRisk(sampleConversation);
    
    return NextResponse.json({
      success: true,
      data: {
        connectionTest: connectionTest,
        churnAnalysis: churnAnalysis,
        message: 'AI analysis service is working correctly'
      }
    });
    
  } catch (error) {
    console.error('❌ AI test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'AI test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
