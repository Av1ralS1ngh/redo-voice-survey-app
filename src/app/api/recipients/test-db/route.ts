// app/api/recipients/test-db/route.ts
// Test endpoint to check database schema

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = supabaseService();
    
    // Test basic connection
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to query users table',
        details: usersError.message,
        code: usersError.code
      });
    }

    // Check if required columns exist
    const sampleUser = users?.[0];
    const requiredColumns = [
      'uid',
      'email', 
      'full_survey_url',
      'tiny_url',
      'is_recipient',
      'batch_id',
      'uploaded_at'
    ];

    const missingColumns = requiredColumns.filter(col => !(col in (sampleUser || {})));
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      usersTableExists: true,
      sampleUser: sampleUser,
      requiredColumns: requiredColumns,
      missingColumns: missingColumns,
      hasAllColumns: missingColumns.length === 0
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
