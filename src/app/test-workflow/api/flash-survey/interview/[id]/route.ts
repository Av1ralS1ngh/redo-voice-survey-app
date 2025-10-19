import { NextRequest, NextResponse } from 'next/server';
import { loadInterview } from '../../../../../../utils/data-persistence';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log('🔍 Loading interview data for ID:', id);
    
    const interview = loadInterview(id);

    if (interview) {
      console.log('✅ Interview found:', id);
      return NextResponse.json({ success: true, interview });
    } else {
      console.log('❌ Interview not found:', id);
      return NextResponse.json({ success: false, error: 'Interview not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('❌ Error loading interview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load interview data' },
      { status: 500 }
    );
  }
}
