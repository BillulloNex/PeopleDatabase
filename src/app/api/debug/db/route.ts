import { NextResponse } from 'next/server';
import { dbPool } from '@/db/client';

/**
 * Diagnostic endpoint — checks PostgreSQL connectivity and returns profile count.
 * GET /api/debug/db
 */
export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'set-but-masked'}` : 'NOT SET',
  };

  try {
    const client = await dbPool.connect();
    try {
      const countRes = await client.query('SELECT COUNT(*) as total FROM canonical_people');
      diagnostics.postgres = 'connected';
      diagnostics.totalProfiles = parseInt(countRes.rows[0].total, 10);

      const sampleRes = await client.query('SELECT full_name, extraction_method, dedup_method FROM canonical_people ORDER BY created_at DESC LIMIT 3');
      diagnostics.recentProfiles = sampleRes.rows;
    } finally {
      client.release();
    }
  } catch (err: any) {
    diagnostics.postgres = 'FAILED';
    diagnostics.error = err.message || String(err);
    diagnostics.code = err.code || 'unknown';
  }

  return NextResponse.json(diagnostics);
}
