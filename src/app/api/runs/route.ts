import { NextResponse } from 'next/server';
import { getRecentIngestionRuns } from '@/resolver/matcher';

export async function GET() {
  try {
    const runs = await getRecentIngestionRuns();
    return NextResponse.json({
      success: true,
      total: runs.length,
      data: runs
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch ingestion run logs' },
      { status: 500 }
    );
  }
}
