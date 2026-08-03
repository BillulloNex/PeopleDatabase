import { searchPeopleWithExa } from '../lib/exa';
import { extractPersonProfileWithAI } from '../lib/openrouter';
import { upsertExtractedProfile } from '../resolver/matcher';
import { checkOpenRouterHealth } from '../lib/openrouter-health';

export async function runExaDiscoveryWorker(query: string = 'founders of AI startups', count: number = 5) {
  // 🛡️ CIRCUIT BREAKER: Verify AI is available before crawling
  const health = await checkOpenRouterHealth();
  if (!health.healthy) {
    console.error(`[Exa Worker] ❌ ABORTING CRAWL: ${health.error}`);
    console.error(`[Exa Worker] Skipping "${query}" to prevent garbage data ingestion.`);
    return [];
  }

  console.log(`[Exa Worker] Starting neural search for query: "${query}"...`);
  const exaResults = await searchPeopleWithExa(query, count);

  console.log(`[Exa Worker] Found ${exaResults.length} profile candidates.`);

  if (exaResults.length === 0) {
    return [];
  }

  const itemsToIngest = exaResults.map(item => ({
    rawText: item.text || item.title,
    sourceUrl: item.url
  }));

  const targetAppUrl = process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://people.beenex.org';
  const bulkEndpoint = `${targetAppUrl.replace(/\/$/, '')}/api/ingest/bulk`;

  console.log(`[Exa Worker] Sending ${itemsToIngest.length} profiles in bulk batch to production API: ${bulkEndpoint}`);

  try {
    const res = await fetch(bulkEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INGESTION_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.INGESTION_WEBHOOK_SECRET}` } : {})
      },
      body: JSON.stringify({ items: itemsToIngest })
    });

    const json = await res.json();
    console.log(`[Exa Worker] Live Bulk Response:`, JSON.stringify(json));
    return json.data || [];
  } catch (err: any) {
    console.error(`[Exa Worker] Failed to send bulk payload to production API:`, err.message);
    return [];
  }
}

if (require.main === module) {
  const queryArg = process.argv[2] || 'software engineers building open source rust databases';
  runExaDiscoveryWorker(queryArg, 5)
    .then((results) => console.log(`[Exa Worker] Finished. Processed ${results.length} entities.`))
    .catch((err) => console.error('[Exa Worker] Failed:', err));
}
