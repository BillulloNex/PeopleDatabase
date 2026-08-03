import { NextResponse } from 'next/server';
import { dbPool, PersonRecord, initDatabaseSchema } from '@/db/client';

/**
 * POST /api/restore
 * 
 * Bulk-inserts pre-structured profiles directly into PostgreSQL.
 * Used for restoring from backups — skips AI extraction and dedup.
 * Body: { profiles: PersonRecord[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profiles } = body;

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payload must contain a non-empty "profiles" array' },
        { status: 400 }
      );
    }

    // Ensure schema exists
    await initDatabaseSchema();

    const client = await dbPool.connect();
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    try {
      for (const p of profiles) {
        try {
          const result = await client.query(
            `INSERT INTO canonical_people 
              (id, full_name, headline, bio, primary_email, emails, phones, current_company, current_title, location, skills, social_links, sources, avatar_url, match_confidence, tags, outreach_status, extraction_method, dedup_method, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
             ON CONFLICT (id) DO NOTHING`,
            [
              p.id,
              p.fullName || 'Unknown',
              p.headline || '',
              p.bio || '',
              p.primaryEmail || '',
              p.emails || [],
              p.phones || [],
              p.currentCompany || '',
              p.currentTitle || '',
              p.location || '',
              p.skills || [],
              JSON.stringify(p.socialLinks || []),
              JSON.stringify(p.sources || []),
              p.avatarUrl || '',
              p.matchConfidence || 1.0,
              p.tags || [],
              p.outreachStatus || 'uncontacted',
              p.extractionMethod || 'ai-luna',
              p.dedupMethod || 'no-match-new',
              p.createdAt || new Date().toISOString(),
              p.updatedAt || new Date().toISOString(),
            ]
          );
          if (result.rowCount && result.rowCount > 0) {
            inserted++;
          } else {
            skipped++;
          }
        } catch (err: any) {
          errors++;
        }
      }
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      errors,
      total: profiles.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Restore failed' },
      { status: 500 }
    );
  }
}
