import { NextRequest, NextResponse } from "next/server";
import { TranscriptAnalyticsManager } from "@/lib/analytics";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const analyticsManager = new TranscriptAnalyticsManager();
    
    // Get comprehensive session data
    const transcripts = await analyticsManager.getSessionTranscripts(sessionId);
    if (!transcripts) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const summary = await analyticsManager.generateConversationSummary(sessionId);

    return NextResponse.json({
      sessionId,
      transcripts,
      summary,
      analytics: {
        userVsAgentRatio: transcripts.userMessages.length / transcripts.agentMessages.length,
        conversationQuality: {
          turnCount: transcripts.metrics.totalTurns,
          avgUserResponseLength: transcripts.metrics.averageUserResponseLength,
          avgAgentResponseLength: transcripts.metrics.averageAgentResponseLength,
          duration: transcripts.metrics.conversationDuration,
        },
        separatedTranscripts: {
          userMessages: transcripts.userMessages,
          agentMessages: transcripts.agentMessages,
          chronologicalFlow: transcripts.conversationFlow,
        }
      }
    });

  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
