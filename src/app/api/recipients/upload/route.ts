// app/api/recipients/upload/route.ts
// API endpoint for uploading Excel files with recipient data

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseService } from '@/lib/supabase';

// URL shortening service (using tinyurl.com API)
async function createShortUrl(longUrl: string): Promise<string> {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (response.ok) {
      const shortUrl = await response.text();
      // Check if the response is a valid URL
      if (shortUrl.startsWith('http')) {
        return shortUrl.trim();
      }
    }
    throw new Error('Failed to create short URL');
  } catch (error) {
    console.error('Error creating short URL:', error);
    // Fallback: return the long URL if shortening fails
    return longUrl;
  }
}

// Generate dynamic Vercel URL
function generateSurveyUrl(uid: string, projectId?: string): string {
  // Always use Vercel URL - no fallback to localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`;
  
  console.log('🌐 Generating survey URL with base:', baseUrl);
  const url = `${baseUrl}/s/${uid}`;
  return projectId ? `${url}?project_id=${projectId}` : url;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Only Excel files (.xlsx, .xls) are allowed' }, { status: 400 });
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validate data structure
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty or invalid' }, { status: 400 });
    }

    // Check for required columns
    const firstRow = data[0] as any;
    const hasName = firstRow.hasOwnProperty('name') || firstRow.hasOwnProperty('Name') || firstRow.hasOwnProperty('NAME');
    const hasEmail = firstRow.hasOwnProperty('email') || firstRow.hasOwnProperty('Email') || firstRow.hasOwnProperty('EMAIL');

    if (!hasName || !hasEmail) {
      return NextResponse.json({ 
        error: 'Excel file must contain "name" and "email" columns' 
      }, { status: 400 });
    }

    // Generate batch ID for this upload
    const batchId = crypto.randomUUID();
    const supabase = supabaseService();
    
    // Debug: Test database connection
    console.log('Testing database connection...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('uid')
        .limit(1);
      
      if (testError) {
        console.error('Database connection test failed:', testError);
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: testError.message 
        }, { status: 500 });
      }
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({ 
        error: 'Database connection error',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }
    
    // Process each row
    const recipients = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      // Normalize column names (case insensitive)
      const fullName = row.name || row.Name || row.NAME || '';
      const email = row.email || row.Email || row.EMAIL || '';
      
      if (!fullName.trim() || !email.trim()) {
        errors.push(`Row ${i + 1}: Missing name or email`);
        continue;
      }

      // Split name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      console.log(`Processing: "${fullName}" -> First: "${firstName}", Last: "${lastName}"`);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Row ${i + 1}: Invalid email format: ${email}`);
        continue;
      }

      try {
        // Generate unique UID for this recipient
        const uid = crypto.randomUUID();
        
        // Generate survey URL
        const surveyUrl = generateSurveyUrl(uid, projectId);
        
        // Create short URL
        const shortUrl = await createShortUrl(surveyUrl);
        
        // Insert into database
        const { data: userData, error: insertError } = await supabase
          .from('users')
          .insert({
            uid,
            name: fullName.trim(), // Keep full name for backward compatibility
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase().trim(),
            full_survey_url: surveyUrl,
            tiny_url: shortUrl,
            is_recipient: true,
            batch_id: batchId,
            uploaded_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          // Handle duplicate email
          if (insertError.code === '23505') {
            errors.push(`Row ${i + 1}: Email already exists: ${email}`);
            continue;
          }
          throw insertError;
        }

        // If projectId is provided, also insert into survey_recipients table
        if (projectId) {
          const { error: recipientError } = await supabase
            .from('survey_recipients')
            .insert({
              project_id: projectId,
              recipient_name: fullName.trim(),
              recipient_email: email.toLowerCase().trim(),
              status: 'invited'
            });

          if (recipientError) {
            console.error('Error inserting into survey_recipients:', recipientError);
            // Don't fail the whole upload for this, just log it
          }
        }

        recipients.push({
          uid: userData.uid,
          name: userData.name,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          surveyUrl: userData.full_survey_url,
          shortUrl: userData.tiny_url
        });

      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        let errorMessage = 'Unknown error';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Provide more specific error messages
          if (error.message.includes('duplicate key')) {
            errorMessage = `Email already exists: ${email}`;
          } else if (error.message.includes('null value in column "name"')) {
            errorMessage = 'Name field is required but was empty';
          } else if (error.message.includes('violates not-null constraint')) {
            errorMessage = 'Required field is missing or empty';
          } else if (error.message.includes('violates')) {
            errorMessage = 'Database constraint violation';
          } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
            errorMessage = 'Database table not found - please run the SQL setup script';
          }
        }
        
        errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${recipients.length} recipients`,
      batchId,
      recipients,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: recipients.length,
      totalErrors: errors.length
    });

  } catch (error) {
    console.error('Excel upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process Excel file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
