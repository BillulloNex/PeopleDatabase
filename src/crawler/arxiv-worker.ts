/**
 * arXiv Discovery Worker — 100% FREE.
 * 
 * Queries the arXiv API for recent research papers and extracts
 * author profiles with affiliations, co-author networks, and research topics.
 * 
 * arXiv has 2.4M+ papers with author metadata. Rate limit: ~3 req/sec.
 */

const ARXIV_API = 'http://export.arxiv.org/api/query';

// Diverse research categories to discover different types of researchers
const ARXIV_CATEGORIES: { label: string; query: string }[] = [
  { label: 'Machine Learning', query: 'cat:cs.LG' },
  { label: 'Artificial Intelligence', query: 'cat:cs.AI' },
  { label: 'Computer Vision', query: 'cat:cs.CV' },
  { label: 'Natural Language Processing', query: 'cat:cs.CL' },
  { label: 'Cryptography', query: 'cat:cs.CR' },
  { label: 'Distributed Computing', query: 'cat:cs.DC' },
  { label: 'Databases', query: 'cat:cs.DB' },
  { label: 'Robotics', query: 'cat:cs.RO' },
  { label: 'Programming Languages', query: 'cat:cs.PL' },
  { label: 'Software Engineering', query: 'cat:cs.SE' },
  { label: 'Quantum Computing', query: 'cat:quant-ph' },
  { label: 'Computational Biology', query: 'cat:q-bio.QM' },
  { label: 'Economics', query: 'cat:econ.GN' },
  { label: 'Statistics ML', query: 'cat:stat.ML' },
  { label: 'Physics Data Analysis', query: 'cat:physics.data-an' },
  { label: 'Networking', query: 'cat:cs.NI' },
  { label: 'Human Computer Interaction', query: 'cat:cs.HC' },
  { label: 'Information Retrieval', query: 'cat:cs.IR' },
];

interface ArxivAuthor {
  name: string;
  affiliation?: string;
}

interface ArxivPaper {
  title: string;
  authors: ArxivAuthor[];
  summary: string;
  published: string;
  link: string;
  categories: string[];
}

function parseArxivXml(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = [];
  const entries = xml.split('<entry>').slice(1); // Skip header

  for (const entry of entries) {
    try {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || '';
      const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || '';

      // Extract authors with affiliations
      const authors: ArxivAuthor[] = [];
      const authorBlocks = entry.split('<author>').slice(1);
      for (const ab of authorBlocks) {
        const name = ab.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim();
        const affiliation = ab.match(/<arxiv:affiliation[^>]*>([\s\S]*?)<\/arxiv:affiliation>/)?.[1]?.trim();
        if (name) authors.push({ name, affiliation });
      }

      // Extract categories
      const categories: string[] = [];
      const catMatches = entry.matchAll(/category[^>]*term="([^"]+)"/g);
      for (const cm of catMatches) categories.push(cm[1]);

      if (title && authors.length > 0) {
        papers.push({ title, authors, summary, published, link, categories });
      }
    } catch {
      // Skip malformed entries
    }
  }

  return papers;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runArxivDiscoveryWorker(categoryIndex?: number, maxResults: number = 25) {
  const idx = categoryIndex !== undefined
    ? categoryIndex % ARXIV_CATEGORIES.length
    : Math.floor(Math.random() * ARXIV_CATEGORIES.length);

  const category = ARXIV_CATEGORIES[idx];
  // Random offset so each run gets different papers
  const offset = Math.floor(Math.random() * 500);

  console.log(`[arXiv Worker] Category: "${category.label}" | Offset: ${offset} | Max: ${maxResults}`);

  const url = `${ARXIV_API}?search_query=${encodeURIComponent(category.query)}&start=${offset}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PeopleDatabase-Discovery/1.0' }
    });

    if (!res.ok) {
      console.error(`[arXiv Worker] API returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const papers = parseArxivXml(xml);
    console.log(`[arXiv Worker] Parsed ${papers.length} papers.`);

    // Extract unique authors with pre-parsed profiles (skip LLM!)
    const authorMap = new Map<string, any>();

    for (const paper of papers) {
      for (const author of paper.authors) {
        if (authorMap.has(author.name)) continue;

        authorMap.set(author.name, {
          preParsedProfile: {
            fullName: author.name,
            headline: author.affiliation
              ? `Researcher at ${author.affiliation}`
              : `${category.label} Researcher`,
            bio: `Published: "${paper.title}" (${paper.published.split('T')[0]}). ${paper.summary.slice(0, 300)}`,
            location: '',
            emails: [],
            phones: [],
            company: author.affiliation || '',
            title: 'Researcher',
            skills: paper.categories.slice(0, 5),
            socialLinks: [{ platform: 'arXiv', url: paper.link, handle: '' }]
          },
          sourceUrl: paper.link
        });
      }
    }

    const items = Array.from(authorMap.values());
    console.log(`[arXiv Worker] Extracted ${items.length} unique authors.`);

    if (items.length === 0) return [];

    // Send to production (pre-parsed = NO LLM cost!)
    const targetAppUrl = process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://people.beenex.org';
    const bulkEndpoint = `${targetAppUrl.replace(/\/$/, '')}/api/ingest/bulk`;

    console.log(`[arXiv Worker] Sending ${items.length} pre-parsed profiles to ${bulkEndpoint}`);

    const res2 = await fetch(bulkEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INGESTION_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.INGESTION_WEBHOOK_SECRET}` } : {})
      },
      body: JSON.stringify({ items })
    });

    const json = await res2.json();
    console.log(`[arXiv Worker] Response:`, JSON.stringify(json).slice(0, 500));
    return json.data || [];
  } catch (err: any) {
    console.error(`[arXiv Worker] Failed:`, err.message);
    return [];
  }
}

if (require.main === module) {
  const catIdx = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  const maxResults = process.argv[3] ? parseInt(process.argv[3]) : 25;
  runArxivDiscoveryWorker(catIdx, maxResults)
    .then((results) => console.log(`[arXiv Worker] Finished. ${results.length} entities.`))
    .catch((err) => console.error('[arXiv Worker] Failed:', err));
}
