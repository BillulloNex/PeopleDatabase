/**
 * Wikipedia/Wikidata Discovery Worker — 100% FREE, zero API keys.
 * 
 * Uses Wikidata SPARQL endpoint to discover millions of notable people
 * across every industry, nationality, and profession on Earth.
 * 
 * Rate limits: Very generous (~60 req/min). No auth needed.
 */

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

// Wikidata occupation IDs for diverse people discovery
const OCCUPATION_QUERIES: { label: string; qid: string; limit: number }[] = [
  { label: 'computer scientists', qid: 'Q82594', limit: 50 },
  { label: 'software engineers', qid: 'Q4220920', limit: 50 },
  { label: 'entrepreneurs', qid: 'Q131524', limit: 50 },
  { label: 'physicists', qid: 'Q169470', limit: 50 },
  { label: 'mathematicians', qid: 'Q170790', limit: 50 },
  { label: 'economists', qid: 'Q188094', limit: 50 },
  { label: 'biologists', qid: 'Q864503', limit: 50 },
  { label: 'chemists', qid: 'Q593644', limit: 50 },
  { label: 'journalists', qid: 'Q1930187', limit: 50 },
  { label: 'film directors', qid: 'Q2526255', limit: 50 },
  { label: 'architects', qid: 'Q42973', limit: 50 },
  { label: 'physicians', qid: 'Q39631', limit: 50 },
  { label: 'lawyers', qid: 'Q40348', limit: 50 },
  { label: 'politicians', qid: 'Q82955', limit: 50 },
  { label: 'investors', qid: 'Q1397808', limit: 50 },
  { label: 'engineers', qid: 'Q81096', limit: 50 },
  { label: 'professors', qid: 'Q121594', limit: 50 },
  { label: 'researchers', qid: 'Q1650915', limit: 50 },
  { label: 'CEOs', qid: 'Q484876', limit: 50 },
  { label: 'designers', qid: 'Q5322166', limit: 50 },
];

interface WikidataPerson {
  name: string;
  description: string;
  birthDate?: string;
  nationality?: string;
  occupation?: string;
  website?: string;
  wikidataId: string;
  wikipediaUrl?: string;
}

async function queryWikidata(sparql: string): Promise<any[]> {
  const url = `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(sparql)}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PeopleDatabase-Discovery/1.0 (https://people.beenex.org)',
      'Accept': 'application/sparql-results+json'
    }
  });

  if (!res.ok) {
    console.error(`[Wikidata] SPARQL query failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  return data.results?.bindings || [];
}

function buildPeopleSparql(occupationQid: string, limit: number, offset: number): string {
  return `
    SELECT DISTINCT ?person ?personLabel ?personDescription ?birthDate ?nationalityLabel ?occupationLabel ?website ?article WHERE {
      ?person wdt:P31 wd:Q5 ;          # is a human
              wdt:P106 wd:${occupationQid} .  # has this occupation
      
      OPTIONAL { ?person wdt:P569 ?birthDate . }
      OPTIONAL { ?person wdt:P27 ?nationality . }
      OPTIONAL { ?person wdt:P106 ?occupation . }
      OPTIONAL { ?person wdt:P856 ?website . }
      OPTIONAL {
        ?article schema:about ?person ;
                 schema:isPartOf <https://en.wikipedia.org/> .
      }
      
      # Only people born after 1940 (likely still alive/relevant)
      FILTER(BOUND(?birthDate) && YEAR(?birthDate) > 1940)
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
    }
    ORDER BY DESC(?birthDate)
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

function parseWikidataResults(bindings: any[]): WikidataPerson[] {
  const seen = new Set<string>();
  const people: WikidataPerson[] = [];

  for (const b of bindings) {
    const wikidataId = b.person?.value?.split('/').pop() || '';
    if (seen.has(wikidataId)) continue;
    seen.add(wikidataId);

    const name = b.personLabel?.value;
    if (!name || name === wikidataId) continue; // Skip if no English label

    people.push({
      name,
      description: b.personDescription?.value || '',
      birthDate: b.birthDate?.value?.split('T')[0],
      nationality: b.nationalityLabel?.value,
      occupation: b.occupationLabel?.value,
      website: b.website?.value,
      wikidataId,
      wikipediaUrl: b.article?.value
    });
  }

  return people;
}

function buildRawTextFromWikidata(person: WikidataPerson): string {
  const parts: string[] = [];
  parts.push(`Name: ${person.name}`);
  if (person.description) parts.push(`Description: ${person.description}`);
  if (person.occupation) parts.push(`Occupation: ${person.occupation}`);
  if (person.nationality) parts.push(`Nationality: ${person.nationality}`);
  if (person.birthDate) parts.push(`Born: ${person.birthDate}`);
  if (person.website) parts.push(`Website: ${person.website}`);
  if (person.wikipediaUrl) parts.push(`Wikipedia: ${person.wikipediaUrl}`);
  parts.push(`Wikidata: https://www.wikidata.org/wiki/${person.wikidataId}`);
  return parts.join('\n');
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runWikidataDiscoveryWorker(occupationIndex?: number, batchSize: number = 20) {
  const idx = occupationIndex !== undefined 
    ? occupationIndex % OCCUPATION_QUERIES.length 
    : Math.floor(Math.random() * OCCUPATION_QUERIES.length);
  
  const occupation = OCCUPATION_QUERIES[idx];
  // Randomize offset to get different people each run
  const offset = Math.floor(Math.random() * 200);

  console.log(`[Wikidata Worker] Querying: "${occupation.label}" (offset ${offset}, batch ${batchSize})`);

  const sparql = buildPeopleSparql(occupation.qid, batchSize, offset);
  const bindings = await queryWikidata(sparql);
  const people = parseWikidataResults(bindings);

  console.log(`[Wikidata Worker] Found ${people.length} people from Wikidata.`);

  if (people.length === 0) return [];

  const items = people.map(person => ({
    preParsedProfile: {
      fullName: person.name,
      headline: person.description || person.occupation || '',
      bio: [
        person.description,
        person.occupation ? `Occupation: ${person.occupation}` : '',
        person.nationality ? `Nationality: ${person.nationality}` : '',
        person.birthDate ? `Born: ${person.birthDate}` : '',
      ].filter(Boolean).join('. '),
      location: person.nationality || '',
      emails: [],
      phones: [],
      company: '',
      title: person.occupation || '',
      skills: [person.occupation].filter(Boolean),
      socialLinks: [
        person.wikipediaUrl ? { platform: 'Wikipedia', url: person.wikipediaUrl, handle: '' } : null,
        person.website ? { platform: 'Website', url: person.website, handle: '' } : null,
        { platform: 'Wikidata', url: `https://www.wikidata.org/wiki/${person.wikidataId}`, handle: person.wikidataId }
      ].filter(Boolean)
    },
    sourceUrl: person.wikipediaUrl || `https://www.wikidata.org/wiki/${person.wikidataId}`
  }));

  // Send to production bulk API
  const targetAppUrl = process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://people.beenex.org';
  const bulkEndpoint = `${targetAppUrl.replace(/\/$/, '')}/api/ingest/bulk`;

  console.log(`[Wikidata Worker] Sending ${items.length} profiles to ${bulkEndpoint}`);

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
    console.log(`[Wikidata Worker] Bulk Response:`, JSON.stringify(json));
    return json.data || [];
  } catch (err: any) {
    console.error(`[Wikidata Worker] Failed to send bulk payload:`, err.message);
    return [];
  }
}

// CLI entry point
if (require.main === module) {
  const occIdx = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  const batchSize = process.argv[3] ? parseInt(process.argv[3]) : 20;
  runWikidataDiscoveryWorker(occIdx, batchSize)
    .then((results) => console.log(`[Wikidata Worker] Finished. Processed ${results.length} entities.`))
    .catch((err) => console.error('[Wikidata Worker] Failed:', err));
}
