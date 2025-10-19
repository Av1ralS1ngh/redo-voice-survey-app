import { NextResponse } from "next/server";

export async function GET() {
  console.log('Hume credentials request received');
  
  if (!process.env.HUME_API_KEY) {
    console.error('HUME_API_KEY not found in environment');
    return NextResponse.json({ error: "Hume not configured - missing API key" }, { status: 500 });
  }

  console.log('HUME_API_KEY found, returning credentials for direct WebSocket connection');
  
  // Per official Hume documentation, we use API key directly in WebSocket URL
  // No token exchange needed for EVI WebSocket connections
  return NextResponse.json({ 
    apiKey: process.env.HUME_API_KEY,
    configId: process.env.HUME_CONFIG_ID || null
  });
}
