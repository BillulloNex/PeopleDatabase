import { NextResponse } from 'next/server';
import { extractPersonProfileWithAI } from '@/lib/openrouter';
import { upsertExtractedProfile, logIngestionRun } from '@/resolver/matcher';
import { PersonRecord } from '@/db/client';

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const authHeader = request.headers.get('Authorization');
    const webhookSecret = process.env.INGESTION_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized bulk ingestion attempt' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payload must contain a non-empty "items" array' },
        { status: 400 }
      );
    }

    console.log(`[Bulk Ingest] Starting ingestion for batch of ${items.length} records...`);

    const results: PersonRecord[] = [];
    const errors: { index: number; sourceUrl?: string; error: string }[] = [];

    // Process items in parallel chunks of 5 to optimize throughput
    const chunkSize = 5;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (item, idx) => {
          try {
            let profileToUpsert = item.preParsedProfile;
            if (!profileToUpsert && item.rawText) {
              profileToUpsert = await extractPersonProfileWithAI(
                item.rawText,
                item.sourceUrl || 'http://unknown-source.org'
              );
            }

            if (profileToUpsert) {
              const person = await upsertExtractedProfile(profileToUpsert);
              results.push(person);
            }
          } catch (err: any) {
            console.error(`[Bulk Ingest] Item ${i + idx} failed:`, err);
            errors.push({ index: i + idx, sourceUrl: item.sourceUrl, error: err.message });
          }
        })
      );
    }

    const durationMs = Date.now() - startTime;

    // Record Run Log
    await logIngestionRun({
      runType: 'bulk_webhook',
      queryOrSource: `Bulk Ingest Batch (${items.length} items)`,
      status: errors.length === 0 ? 'success' : results.length > 0 ? 'partial_success' : 'failed',
      processedCount: results.length,
      createdCount: results.length,
      mergedCount: 0,
      durationMs,
      entities: results.map(r => ({ id: r.id, fullName: r.fullName, isNew: true }))
    });

    return NextResponse.json({
      success: true,
      batchSize: items.length,
      processed: results.length,
      failed: errors.length,
      durationMs,
      throughputPerSec: Number((results.length / (durationMs / 1000)).toFixed(2)),
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Bulk ingestion failed' },
      { status: 500 }
    );
  }
}
