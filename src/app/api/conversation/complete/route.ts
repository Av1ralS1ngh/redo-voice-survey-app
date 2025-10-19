import { NextRequest, NextResponse } from "next/server";
import { conversationManager } from "@/lib/conversation-manager";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userUid } = await req.json();

    if (!sessionId || !userUid) {
      return NextResponse.json(
        { error: "sessionId and userUid are required" },
        { status: 400 }
      );
    }

    // Complete and save the conversation
    await conversationManager.completeConversation(sessionId, userUid);

    // 🎵 TRIGGER AUDIO RECONSTRUCTION (Fire and forget)
    console.log(`🎯 Triggering audio reconstruction for session: ${sessionId}`);
    
    // Start audio reconstruction in the background (don't wait for completion)
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/conversation/audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId, 
        action: 'start' 
      })
    })
    .then(response => response.json())
    .then(result => {
      console.log(`🎵 Audio reconstruction initiated:`, result);
      
      // If successful and needs polling, start polling
      if (result.success && result.chatId && result.status !== 'COMPLETE') {
        console.log(`⏳ Starting background polling for chat: ${result.chatId}`);
        
        // Poll for completion in the background
        setTimeout(() => {
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/conversation/audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sessionId, 
              chatId: result.chatId,
              action: 'poll' 
            })
          })
          .then(response => response.json())
          .then(pollResult => {
            console.log(`🎵 Audio polling result:`, pollResult);
          })
          .catch(error => {
            console.error('Audio polling error:', error);
          });
        }, 10000); // Wait 10 seconds before starting to poll
      }
    })
    .catch(error => {
      console.error('Audio reconstruction error:', error);
    });

    return NextResponse.json({ 
      success: true,
      message: "Conversation completed and saved, audio processing initiated"
    });

  } catch (error) {
    console.error("Conversation completion error:", error);
    return NextResponse.json(
      { error: "Failed to complete conversation", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
