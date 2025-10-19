/**
 * AI Demo Results API
 * Retrieves stored demo results by ID
 * 
 * Note: Currently stores results in-memory for the session
 * Future: Can be extended to persist to database
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (will be lost on server restart)
// Future: Replace with database storage
const resultsStore = new Map<string, any>();

/**
 * Store demo results
 */
export function storeDemoResults(demoId: string, results: any): void {
  resultsStore.set(demoId, {
    ...results,
    storedAt: new Date().toISOString()
  });
}

/**
 * GET /api/ai-demo/results/[id]
 * Retrieve demo results by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Demo ID is required' },
        { status: 400 }
      );
    }

    const results = resultsStore.get(id);

    if (!results) {
      return NextResponse.json(
        { error: 'Demo results not found. Results may have expired.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      demoId: id,
      ...results
    });

  } catch (error) {
    console.error('Error retrieving demo results:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve demo results' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-demo/results/[id]
 * Delete demo results by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Demo ID is required' },
        { status: 400 }
      );
    }

    const existed = resultsStore.delete(id);

    if (!existed) {
      return NextResponse.json(
        { error: 'Demo results not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Demo results deleted'
    });

  } catch (error) {
    console.error('Error deleting demo results:', error);
    return NextResponse.json(
      { error: 'Failed to delete demo results' },
      { status: 500 }
    );
  }
}

/**
 * Clean up old results (older than 24 hours)
 */
function cleanupOldResults(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [id, results] of resultsStore.entries()) {
    const storedAt = new Date(results.storedAt).getTime();
    if (now - storedAt > maxAge) {
      resultsStore.delete(id);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldResults, 60 * 60 * 1000);
}

