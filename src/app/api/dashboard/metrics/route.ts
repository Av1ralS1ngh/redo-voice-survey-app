// app/api/dashboard/metrics/route.ts
// API endpoint for dashboard metrics

import { NextRequest, NextResponse } from "next/server";
import { conversationService } from "@/lib/conversation-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const [metrics, recentActivity] = await Promise.all([
      conversationService.getConversationMetrics(),
      conversationService.getRecentActivity(days)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        recentActivity
      }
    });

  } catch (error) {
    console.error("Dashboard metrics API error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch dashboard metrics", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
