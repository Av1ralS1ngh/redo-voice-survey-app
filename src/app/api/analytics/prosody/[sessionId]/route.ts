import { NextRequest, NextResponse } from "next/server";
import { ProsodyAnalyticsManager } from "@/lib/prosody-analytics-manager";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const prosodyManager = new ProsodyAnalyticsManager();
    
    // Get comprehensive prosody analysis
    const prosodyAnalysis = await prosodyManager.getSessionProsodyAnalysis(sessionId);
    
    if (!prosodyAnalysis) {
      return NextResponse.json({ error: "Prosody analysis not found" }, { status: 404 });
    }

    return NextResponse.json({
      sessionId,
      prosodyAnalysis,
      success: true
    });

  } catch (error) {
    console.error("Prosody analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to generate prosody analytics", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, conversationId } = await req.json();

    if (!sessionId || !conversationId) {
      return NextResponse.json(
        { error: "sessionId and conversationId are required" },
        { status: 400 }
      );
    }

    const prosodyManager = new ProsodyAnalyticsManager();
    
    // Calculate and store prosody metrics
    const prosodyMetrics = await prosodyManager.calculateConversationProsodyMetrics(conversationId);
    
    if (!prosodyMetrics) {
      return NextResponse.json({ error: "Failed to calculate prosody metrics" }, { status: 500 });
    }

    // Store in database
    const { supabaseService } = await import("@/lib/supabase");
    
    const { data, error } = await supabaseService()
      .from('prosody_analytics')
      .upsert(prosodyMetrics, { 
        onConflict: 'conversation_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing prosody analytics:', error);
      return NextResponse.json({ error: "Failed to store prosody analytics" }, { status: 500 });
    }

    return NextResponse.json({
      sessionId,
      conversationId,
      prosodyMetrics: data,
      success: true
    });

  } catch (error) {
    console.error("Prosody analytics storage error:", error);
    return NextResponse.json(
      { error: "Failed to store prosody analytics", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
