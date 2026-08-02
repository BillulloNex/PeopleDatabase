import { NextResponse } from 'next/server';
import { extractPersonProfileWithAI } from '@/lib/openrouter';
import { upsertExtractedProfile, logIngestionRun } from '@/resolver/matcher';

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const authHeader = request.headers.get('Authorization');
    const webhookSecret = process.env.INGESTION_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized ingestion attempt' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rawText, sourceUrl, preParsedProfile } = body;

    if (!rawText && !preParsedProfile) {
      return NextResponse.json(
        { success: false, error: 'Missing rawText or preParsedProfile payload' },
        { status: 400 }
      );
    }

    let profileToUpsert = preParsedProfile;
    if (!profileToUpsert && rawText) {
      profileToUpsert = await extractPersonProfileWithAI(rawText, sourceUrl || 'http://unknown-source.org');
    }

    const person = await upsertExtractedProfile(profileToUpsert);
    const durationMs = Date.now() - startTime;

    // Record Run Log
    await logIngestionRun({
      runType: 'single_webhook',
      queryOrSource: sourceUrl || profileToUpsert.fullName || 'Single Ingestion Webhook',
      status: 'success',
      processedCount: 1,
      createdCount: 1,
      mergedCount: 0,
      durationMs,
      entities: [{ id: person.id, fullName: person.fullName, isNew: true }]
    });

    return NextResponse.json({
      success: true,
      message: 'Entity successfully ingested and resolved',
      data: person
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ingestion failed' },
      { status: 500 }
    );
  }
}
