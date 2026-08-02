import { searchPeopleWithExa } from '../lib/exa';
import { extractPersonProfileWithAI } from '../lib/openrouter';
import { upsertExtractedProfile } from '../resolver/matcher';

export async function runExaDiscoveryWorker(query: string = 'founders of AI startups', count: number = 5) {
  console.log(`[Exa Worker] Starting neural search for query: "${query}"...`);
  const exaResults = await searchPeopleWithExa(query, count);

  console.log(`[Exa Worker] Found ${exaResults.length} profile candidates.`);

  const processed = [];
  for (const item of exaResults) {
    console.log(`[Exa Worker] Processing page: ${item.title} (${item.url})`);
    const rawContent = item.text || item.title;
    const extracted = await extractPersonProfileWithAI(rawContent, item.url);
    const person = await upsertExtractedProfile(extracted);
    processed.push(person);
    console.log(`[Exa Worker] Successfully upserted entity: ${person.fullName} (${person.id})`);
  }

  return processed;
}

if (require.main === module) {
  const queryArg = process.argv[2] || 'software engineers building open source rust databases';
  runExaDiscoveryWorker(queryArg, 5)
    .then((results) => console.log(`[Exa Worker] Finished. Processed ${results.length} entities.`))
    .catch((err) => console.error('[Exa Worker] Failed:', err));
}
