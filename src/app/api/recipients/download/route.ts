// app/api/recipients/download/route.ts
// API endpoint for downloading recipient lists

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const format = searchParams.get('format') || 'excel'; // excel or csv

    const supabase = supabaseService();
    
    // Build query
    let query = supabase
      .from('users')
      .select('uid, name, first_name, last_name, email, full_survey_url, tiny_url, batch_id, uploaded_at')
      .eq('is_recipient', true)
      .order('uploaded_at', { ascending: false });

    // Filter by batch if specified
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data: recipients, error } = await query;

    if (error) {
      throw error;
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 404 });
    }

    // Prepare data for export
    const exportData = recipients.map(recipient => ({
      'First Name': recipient.first_name || '',
      'Last Name': recipient.last_name || '',
      'Full Name': recipient.name || '',
      'Email': recipient.email,
      'Survey URL': recipient.full_survey_url,
      'Short URL': recipient.tiny_url,
      'Batch ID': recipient.batch_id,
      'Uploaded At': new Date(recipient.uploaded_at).toLocaleString()
    }));

    if (format === 'csv') {
      // Generate CSV
      const csvContent = [
        'First Name,Last Name,Full Name,Email,Survey URL,Short URL,Batch ID,Uploaded At',
        ...exportData.map(row => 
          `"${row['First Name']}","${row['Last Name']}","${row['Full Name']}","${row.Email}","${row['Survey URL']}","${row['Short URL']}","${row['Batch ID']}","${row['Uploaded At']}"`
        )
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="recipients-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // Generate Excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 20 }, // Full Name
        { wch: 30 }, // Email
        { wch: 50 }, // Survey URL
        { wch: 30 }, // Short URL
        { wch: 40 }, // Batch ID
        { wch: 25 }  // Uploaded At
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="recipients-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate download file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get recipient list data (for display)
export async function POST(request: NextRequest) {
  try {
    const { batchId, limit = 100, offset = 0 } = await request.json();

    const supabase = supabaseService();
    
    let query = supabase
      .from('users')
      .select('uid, name, first_name, last_name, email, full_survey_url, tiny_url, batch_id, uploaded_at')
      .eq('is_recipient', true)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data: recipients, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_recipient', true);

    if (batchId) {
      countQuery = countQuery.eq('batch_id', batchId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      recipients: recipients || [],
      total: count || 0,
      hasMore: (offset + (recipients?.length || 0)) < (count || 0)
    });

  } catch (error) {
    console.error('Fetch recipients error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch recipients',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
