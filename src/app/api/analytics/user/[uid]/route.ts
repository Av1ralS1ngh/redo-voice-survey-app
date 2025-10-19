import { NextRequest, NextResponse } from "next/server";
import { TranscriptAnalyticsManager } from "@/lib/analytics";

export async function GET(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;

    if (!uid) {
      return NextResponse.json({ error: "User UID is required" }, { status: 400 });
    }

    const analyticsManager = new TranscriptAnalyticsManager();
    
    // Get all sessions for this user
    const userAnalytics = await analyticsManager.getUserAnalytics(uid);

    // Aggregate analytics across all sessions
    const aggregatedMetrics = {
      totalSessions: userAnalytics.length,
      totalConversations: userAnalytics.reduce((sum, session) => sum + session.metrics.totalTurns, 0),
      totalUserMessages: userAnalytics.reduce((sum, session) => sum + session.metrics.userTurns, 0),
      totalAgentMessages: userAnalytics.reduce((sum, session) => sum + session.metrics.agentTurns, 0),
      averageSessionLength: userAnalytics.length > 0 
        ? userAnalytics.reduce((sum, session) => sum + session.metrics.totalTurns, 0) / userAnalytics.length 
        : 0,
      averageUserResponseLength: userAnalytics.length > 0
        ? userAnalytics.reduce((sum, session) => sum + session.metrics.averageUserResponseLength, 0) / userAnalytics.length
        : 0,
    };

    return NextResponse.json({
      userUid: uid,
      aggregatedMetrics,
      sessions: userAnalytics,
      insights: {
        engagementLevel: aggregatedMetrics.averageSessionLength > 10 ? 'high' : 
                        aggregatedMetrics.averageSessionLength > 5 ? 'medium' : 'low',
        communicationStyle: aggregatedMetrics.averageUserResponseLength > 10 ? 'detailed' :
                           aggregatedMetrics.averageUserResponseLength > 5 ? 'moderate' : 'concise',
        totalFeedbackProvided: aggregatedMetrics.totalUserMessages,
      }
    });

  } catch (error) {
    console.error("User analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to generate user analytics", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
