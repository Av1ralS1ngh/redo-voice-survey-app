// app/api/recipients/template/route.ts
// API endpoint to download Excel template

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Create sample data for template
    const templateData = [
      {
        'Name': 'John Doe',
        'Email': 'john.doe@example.com'
      },
      {
        'Name': 'Jane Smith', 
        'Email': 'jane.smith@example.com'
      },
      {
        'Name': 'Bob Johnson',
        'Email': 'bob.johnson@example.com'
      }
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Auto-size columns
    worksheet['!cols'] = [
      { wch: 20 }, // Name
      { wch: 30 }  // Email
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="recipients-template.xlsx"'
      }
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
