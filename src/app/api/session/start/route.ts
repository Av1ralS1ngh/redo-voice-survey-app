import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { PureEVIManager } from "@/lib/pure-evi";
import { SurveySessionManager } from "@/lib/survey-session";
import { HumeClient } from "hume";

export async function POST(req: NextRequest) {
  try {
    const { uid, systemPrompt } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    // Get user information
    const userResult = await supabaseService()
      .from("users")
      .select("name, email")
      .eq("uid", uid)
      .single();

    const userName = userResult.data?.name || `User ${uid}`;
    
    // Initialize managers
    const pureEVIManager = new PureEVIManager();
    const sessionManager = new SurveySessionManager();
    
    // Create database session first
    const dbSession = await sessionManager.startPersonalizedSession(
      uid, 
      userName, 
      "pure-api" // No actual config ID needed
    );

    // 🧪 TEST: Chat groups are auto-created by Hume, we'll capture them post-connection
    console.log("🧪 Chat groups are auto-created by Hume during WebSocket connection");
    console.log("📋 We'll capture the chat group ID after connection is established");

    // No need to update metadata here - it will be stored in conversation_data when chat metadata arrives

    // Create personalized EVI session with pure API
    const eviSession = await pureEVIManager.createPersonalizedSession(
      uid,
      userName,
      dbSession.id,
      systemPrompt
    );

    // Initialize conversation buffer
    const { conversationManager } = await import("@/lib/conversation-manager");
    await conversationManager.startConversation(dbSession.id, userName, uid);

    return NextResponse.json({
      sessionId: dbSession.id,
      name: userName,
      accessToken: eviSession.accessToken,
      configId: (eviSession.settings as any).configId,
      status: "started"
    });

  } catch (error) {
    console.error("Session start error:", error);
    return NextResponse.json(
      { error: "Failed to start session", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
