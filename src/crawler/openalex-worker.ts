export {};
/**
 * OpenAlex Worker — 250M+ Academic Works
 * 
 * OpenAlex is a free, open catalog of the world's scholarly works.
 * No API key required. Polite pool: add email to get higher rate limits.
 * 
 * Usage: npx tsx src/crawler/openalex-worker.ts <concept_index> <limit>
 */

const INGEST_URL = process.env.INGEST_URL || 'http://people.beenex.org/api/ingest/bulk';
const EMAIL = 'peopledb@beenex.org'; // For polite pool

// Broad concepts across all academic disciplines
const CONCEPTS = [
  'artificial intelligence',
  'machine learning',
  'computer science',
  'biology',
  'medicine',
  'chemistry',
  'physics',
  'mathematics',
  'economics',
  'psychology',
  'neuroscience',
  'genetics',
  'climate change',
  'renewable energy',
  'robotics',
  'natural language processing',
  'computer vision',
  'drug discovery',
  'public health',
  'epidemiology',
  'biotechnology',
  'nanotechnology',
  'quantum computing',
  'cybersecurity',
  'data science',
  'materials science',
  'electrical engineering',
  'mechanical engineering',
  'civil engineering',
  'environmental science',
  'sociology',
  'political science',
  'philosophy',
  'education',
  'law',
  'business management',
  'finance',
  'marketing',
  'anthropology',
  'linguistics',
];

interface OpenAlexAuthor {
  id: string;
  display_name: string;
  orcid?: string;
  works_count: number;
  cited_by_count: number;
  last_known_institutions: Array<{
    id: string;
    display_name: string;
    country_code: string;
    type: string;
  }>;
  x_concepts: Array<{
    display_name: string;
    level: number;
    score: number;
  }>;
}

async function fetchOpenAlexAuthors(concept: string, page: number, perPage: number): Promise<any[]> {
  const url = `https://api.openalex.org/authors?search=${encodeURIComponent(concept)}&per_page=${perPage}&page=${page}&mailto=${EMAIL}&sort=cited_by_count:desc`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    const authors: OpenAlexAuthor[] = data.results || [];

    return authors
      .filter(a => a.display_name && a.display_name.length > 2)
      .map(a => {
        const institution = a.last_known_institutions?.[0];
        const topConcepts = (a.x_concepts || [])
          .filter(c => c.level <= 1 && c.score > 30)
          .slice(0, 5)
          .map(c => c.display_name);

        return {
          fullName: a.display_name,
          title: 'Researcher',
          company: institution?.display_name || '',
          headline: `${a.works_count} publications, ${a.cited_by_count} citations${institution ? ` — ${institution.display_name}` : ''}`,
          bio: `Academic researcher with ${a.works_count} published works and ${a.cited_by_count} citations. ${institution ? `Affiliated with ${institution.display_name}${institution.country_code ? ` (${institution.country_code})` : ''}.` : ''} Research areas: ${topConcepts.join(', ') || concept}.`,
          location: institution?.country_code || '',
          emails: [],
          phones: [],
          skills: topConcepts.length > 0 ? topConcepts : [concept],
          socialLinks: [
            { platform: 'OpenAlex', url: a.id.replace('https://openalex.org/', 'https://openalex.org/authors/'), handle: '' },
            ...(a.orcid ? [{ platform: 'ORCID', url: a.orcid, handle: '' }] : []),
          ],
          sourceUrl: a.id,
          sourceDomain: 'openalex.org',
        };
      });
  } catch (err: any) {
    console.error(`[OpenAlex Worker] Error:`, err.message);
    return [];
  }
}

async function main() {
  const conceptIndex = parseInt(process.argv[2] || '0', 10);
  const limit = parseInt(process.argv[3] || '50', 10);

  const concept = CONCEPTS[conceptIndex % CONCEPTS.length];
  console.log(`[OpenAlex Worker] Concept: "${concept}"`);

  const allProfiles: any[] = [];
  const pages = Math.ceil(limit / 50);

  for (let page = 1; page <= pages; page++) {
    const profiles = await fetchOpenAlexAuthors(concept, page, 50);
    allProfiles.push(...profiles);
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`[OpenAlex Worker] Built ${allProfiles.length} profiles for "${concept}"`);

  if (allProfiles.length === 0) return;

  // Send in batches of 50
  for (let i = 0; i < allProfiles.length; i += 50) {
    const batch = allProfiles.slice(i, i + 50);
    try {
      const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: batch }),
      });
      const result = await res.json();
      console.log(`[OpenAlex Worker] Batch ${Math.floor(i/50)+1}: ${JSON.stringify(result).slice(0, 200)}`);
    } catch (err: any) {
      console.error(`[OpenAlex Worker] Batch failed:`, err.message);
    }
  }
}

main().catch(console.error);
