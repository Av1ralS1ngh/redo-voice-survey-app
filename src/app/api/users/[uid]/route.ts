import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ uid: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { uid } = await params;

    const { data, error } = await supabaseService()
      .from("users")
      .select("*")
      .eq("uid", uid)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("User fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
