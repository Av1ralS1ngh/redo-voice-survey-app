import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userUid, isPositive, timestamp } = await request.json();

    if (!sessionId || !userUid || typeof isPositive !== 'boolean') {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, userUid, or isPositive" },
        { status: 400 }
      );
    }

    // Save feedback to database
    const { data, error } = await supabaseService()
      .from("conversation_feedback")
      .insert({
        session_id: sessionId,
        user_uid: userUid,
        is_positive: isPositive,
        submitted_at: timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Database error saving feedback:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    console.log(`✅ Feedback saved: ${isPositive ? 'Positive' : 'Negative'} for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      feedback: data,
      message: "Feedback saved successfully"
    });

  } catch (error) {
    console.error("Error in feedback API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
