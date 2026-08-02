/**
 * ORCID Discovery Worker — 100% FREE.
 * 
 * ORCID is the world's largest researcher identity database with 20M+ profiles.
 * Each profile has verified name, affiliation, publications, and research areas.
 * 
 * Public API: No key needed. Rate limit: ~24 req/sec.
 * Pre-parsed profiles = zero LLM cost.
 */

const ORCID_API = 'https://pub.orcid.org/v3.0';

// Diverse keyword searches to discover different researchers
const ORCID_SEARCH_QUERIES = [
  'machine learning',
  'artificial intelligence',
  'quantum computing',
  'biotechnology',
  'neuroscience',
  'climate change',
  'blockchain',
  'cybersecurity',
  'gene therapy',
  'nanotechnology',
  'renewable energy',
  'autonomous vehicles',
  'computer vision',
  'natural language processing',
  'drug discovery',
  'materials science',
  'astrophysics',
  'epidemiology',
  'protein engineering',
  'robotics',
  'semiconductor',
  'data science',
  'bioinformatics',
  'microelectronics',
  'organic chemistry',
  'computational biology',
  'deep learning',
  'reinforcement learning',
  'medical imaging',
  'genomics',
];

interface OrcidProfile {
  orcidId: string;
  fullName: string;
  bio?: string;
  affiliations: string[];
  keywords: string[];
  emails: string[];
  country?: string;
}

async function searchOrcid(keyword: string, start: number = 0, rows: number = 20): Promise<string[]> {
  const query = encodeURIComponent(`keyword:${keyword} OR biography:${keyword} OR affiliation-org-name:${keyword}`);
  const url = `${ORCID_API}/search/?q=${query}&start=${start}&rows=${rows}`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PeopleDatabase-Discovery/1.0'
    }
  });

  if (!res.ok) {
    console.error(`[ORCID] Search failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return (data.result || []).map((r: any) => r['orcid-identifier']?.path).filter(Boolean);
}

async function getOrcidProfile(orcidId: string): Promise<OrcidProfile | null> {
  const url = `${ORCID_API}/${orcidId}/person`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PeopleDatabase-Discovery/1.0'
    }
  });

  if (!res.ok) return null;

  try {
    const data = await res.json();
    const name = data.name;
    const fullName = [
      name?.['given-names']?.value,
      name?.['family-name']?.value
    ].filter(Boolean).join(' ');

    if (!fullName) return null;

    const bio = data.biography?.content || '';

    const emails: string[] = [];
    for (const e of data.emails?.email || []) {
      if (e.email) emails.push(e.email);
    }

    const keywords: string[] = [];
    for (const kw of data.keywords?.keyword || []) {
      if (kw.content) keywords.push(kw.content);
    }

    const country = data.addresses?.address?.[0]?.country?.value;

    return { orcidId, fullName, bio, affiliations: [], keywords, emails, country };
  } catch {
    return null;
  }
}

async function getOrcidEmployments(orcidId: string): Promise<string[]> {
  const url = `${ORCID_API}/${orcidId}/employments`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PeopleDatabase-Discovery/1.0'
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    const orgs: string[] = [];
    
    for (const group of data['affiliation-group'] || []) {
      for (const summary of group.summaries || []) {
        const org = summary['employment-summary']?.organization?.name;
        if (org) orgs.push(org);
      }
    }

    return [...new Set(orgs)];
  } catch {
    return [];
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runOrcidDiscoveryWorker(queryIndex?: number, batchSize: number = 15) {
  const idx = queryIndex !== undefined
    ? queryIndex % ORCID_SEARCH_QUERIES.length
    : Math.floor(Math.random() * ORCID_SEARCH_QUERIES.length);

  const keyword = ORCID_SEARCH_QUERIES[idx];
  const offset = Math.floor(Math.random() * 200);

  console.log(`[ORCID Worker] Keyword: "${keyword}" | Offset: ${offset} | Batch: ${batchSize}`);

  const orcidIds = await searchOrcid(keyword, offset, batchSize);
  console.log(`[ORCID Worker] Found ${orcidIds.length} ORCID IDs.`);

  if (orcidIds.length === 0) return [];

  const items: any[] = [];

  for (const orcidId of orcidIds) {
    const profile = await getOrcidProfile(orcidId);
    if (!profile) continue;

    const employments = await getOrcidEmployments(orcidId);
    profile.affiliations = employments;

    const currentOrg = employments[0] || '';

    items.push({
      preParsedProfile: {
        fullName: profile.fullName,
        headline: currentOrg
          ? `Researcher at ${currentOrg}`
          : `${keyword} Researcher`,
        bio: profile.bio || `Researcher specializing in ${keyword}. ${employments.length > 0 ? `Affiliated with ${employments.join(', ')}.` : ''}`,
        location: profile.country || '',
        emails: profile.emails,
        phones: [],
        company: currentOrg,
        title: 'Researcher',
        skills: profile.keywords.slice(0, 10),
        socialLinks: [
          { platform: 'ORCID', url: `https://orcid.org/${orcidId}`, handle: orcidId }
        ]
      },
      sourceUrl: `https://orcid.org/${orcidId}`
    });

    await sleep(200); // Respect rate limits
  }

  console.log(`[ORCID Worker] Built ${items.length} pre-parsed profiles.`);

  if (items.length === 0) return [];

  const targetAppUrl = process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://people.beenex.org';
  const bulkEndpoint = `${targetAppUrl.replace(/\/$/, '')}/api/ingest/bulk`;

  console.log(`[ORCID Worker] Sending ${items.length} profiles to ${bulkEndpoint}`);

  try {
    const res = await fetch(bulkEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INGESTION_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.INGESTION_WEBHOOK_SECRET}` } : {})
      },
      body: JSON.stringify({ items })
    });

    const json = await res.json();
    console.log(`[ORCID Worker] Response:`, JSON.stringify(json).slice(0, 500));
    return json.data || [];
  } catch (err: any) {
    console.error(`[ORCID Worker] Failed:`, err.message);
    return [];
  }
}

if (require.main === module) {
  const qIdx = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  const batchSize = process.argv[3] ? parseInt(process.argv[3]) : 15;
  runOrcidDiscoveryWorker(qIdx, batchSize)
    .then((results) => console.log(`[ORCID Worker] Finished. ${results.length} entities.`))
    .catch((err) => console.error('[ORCID Worker] Failed:', err));
}
