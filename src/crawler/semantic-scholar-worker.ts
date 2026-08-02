export {};
/**
 * Semantic Scholar Worker — Academic Research Papers
 * 
 * Free API, no key required for basic endpoints.
 * Great author metadata including h-index, citation counts.
 * 
 * Usage: npx tsx src/crawler/semantic-scholar-worker.ts <topic_index> <limit>
 */

const INGEST_URL = process.env.INGEST_URL || 'http://people.beenex.org/api/ingest/bulk';

const TOPICS = [
  'deep learning',
  'reinforcement learning',
  'transformers neural networks',
  'large language models',
  'protein folding',
  'gene therapy',
  'immunotherapy cancer',
  'CRISPR genome editing',
  'autonomous vehicles',
  'blockchain distributed systems',
  'federated learning',
  'graph neural networks',
  'medical imaging AI',
  'drug repurposing',
  'wearable health monitoring',
  'precision medicine',
  'mRNA vaccines',
  'brain computer interface',
  'quantum machine learning',
  'climate modeling',
  'synthetic biology',
  'organoid research',
  'antibiotic resistance',
  'mental health digital therapeutics',
  'surgical robotics',
  'telemedicine',
  'electronic health records NLP',
  'population genomics',
  'single cell sequencing',
  'epigenetics',
];

async function searchSemanticScholar(topic: string, offset: number, limit: number): Promise<any[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&offset=${offset}&limit=${Math.min(limit, 100)}&fields=title,authors,year,citationCount,url,externalIds`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        console.log('[S2 Worker] Rate limited, waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));
        return [];
      }
      return [];
    }

    const data = await res.json();
    const papers = data.data || [];

    // Extract unique authors from papers
    const authorMap = new Map<string, any>();

    for (const paper of papers) {
      for (const author of (paper.authors || [])) {
        if (!author.name || author.name.length < 3) continue;
        if (authorMap.has(author.authorId || author.name)) continue;

        authorMap.set(author.authorId || author.name, {
          fullName: author.name,
          title: 'Researcher',
          company: '',
          headline: `Published: "${paper.title}" (${paper.year || 'n/a'})${paper.citationCount ? ` — ${paper.citationCount} citations` : ''}`,
          bio: `Author of "${paper.title}"${paper.citationCount ? ` with ${paper.citationCount} citations` : ''}. Research area: ${topic}.`,
          location: '',
          emails: [],
          phones: [],
          skills: [topic],
          socialLinks: [
            { platform: 'Semantic Scholar', url: `https://www.semanticscholar.org/author/${author.authorId || ''}`, handle: author.authorId || '' },
          ],
          sourceUrl: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
          sourceDomain: 'semanticscholar.org',
        });
      }
    }

    return Array.from(authorMap.values());
  } catch (err: any) {
    console.error(`[S2 Worker] Error:`, err.message);
    return [];
  }
}

async function main() {
  const topicIndex = parseInt(process.argv[2] || '0', 10);
  const limit = parseInt(process.argv[3] || '50', 10);

  const topic = TOPICS[topicIndex % TOPICS.length];
  console.log(`[Semantic Scholar Worker] Topic: "${topic}"`);

  const allProfiles: any[] = [];

  for (let offset = 0; offset < limit; offset += 100) {
    const profiles = await searchSemanticScholar(topic, offset, 100);
    allProfiles.push(...profiles);
    await new Promise(r => setTimeout(r, 1000)); // Rate limit: 1 req/sec
  }

  console.log(`[S2 Worker] Built ${allProfiles.length} author profiles for "${topic}"`);

  if (allProfiles.length === 0) return;

  for (let i = 0; i < allProfiles.length; i += 50) {
    const batch = allProfiles.slice(i, i + 50);
    try {
      const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: batch }),
      });
      const result = await res.json();
      console.log(`[S2 Worker] Batch ${Math.floor(i/50)+1}: ${JSON.stringify(result).slice(0, 200)}`);
    } catch (err: any) {
      console.error(`[S2 Worker] Batch failed:`, err.message);
    }
  }
}

main().catch(console.error);
