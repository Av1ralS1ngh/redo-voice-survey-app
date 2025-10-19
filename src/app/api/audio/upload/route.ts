// app/api/audio/upload/route.ts
// API endpoint for uploading conversation audio files

import { NextRequest, NextResponse } from 'next/server';
import { completeAudioUpload } from '@/lib/audio-storage-service';

export async function POST(req: NextRequest) {
  try {
    console.log('🎵 Audio upload request received');
    
    // Parse form data
    const formData = await req.formData();
    
    // Extract required fields
    const conversationId = formData.get('conversationId') as string;
    const turnNumber = parseInt(formData.get('turnNumber') as string);
    const speaker = formData.get('speaker') as 'user' | 'agent';
    const duration = parseInt(formData.get('duration') as string);
    const audioFile = formData.get('audioFile') as File;
    
    // Validate required fields
    if (!conversationId || !turnNumber || !speaker || !duration || !audioFile) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversationId, turnNumber, speaker, duration, audioFile'
      }, { status: 400 });
    }
    
    // Validate speaker value
    if (!['user', 'agent'].includes(speaker)) {
      return NextResponse.json({
        success: false,
        error: 'Speaker must be either "user" or "agent"'
      }, { status: 400 });
    }
    
    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json({
        success: false,
        error: 'File must be an audio file'
      }, { status: 400 });
    }
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File size exceeds 50MB limit'
      }, { status: 400 });
    }
    
    console.log('🎵 Processing audio upload:', {
      conversationId,
      turnNumber,
      speaker,
      duration: `${duration}ms`,
      fileName: audioFile.name,
      fileSize: `${(audioFile.size / 1024).toFixed(2)}KB`,
      fileType: audioFile.type
    });
    
    // Convert File to Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { 
      type: audioFile.type 
    });
    
    // Upload audio file and update database
    const uploadResult = await completeAudioUpload(
      conversationId,
      turnNumber,
      speaker,
      audioBlob,
      duration
    );
    
    console.log('✅ Audio upload completed successfully');
    
    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        size: uploadResult.size,
        duration: uploadResult.duration
      }
    });
    
  } catch (error) {
    console.error('❌ Audio upload failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Audio upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
