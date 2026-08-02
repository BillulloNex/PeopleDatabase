export {};
/**
 * PubMed Worker — Biomedical & Life Sciences Researchers
 * 
 * Free NCBI E-utilities API. No key required (but limited to 3 req/sec).
 * Covers medicine, biology, healthcare, pharmacology.
 * 
 * Usage: npx tsx src/crawler/pubmed-worker.ts <topic_index> <limit>
 */

const INGEST_URL = process.env.INGEST_URL || 'http://people.beenex.org/api/ingest/bulk';

const TOPICS = [
  'cardiology treatment outcomes',
  'oncology immunotherapy',
  'diabetes management',
  'mental health interventions',
  'orthopedic surgery techniques',
  'pediatric healthcare',
  'geriatric medicine',
  'emergency medicine triage',
  'radiology diagnostic imaging',
  'neurosurgery',
  'gastroenterology',
  'pulmonology respiratory',
  'nephrology kidney disease',
  'dermatology skin cancer',
  'ophthalmology retinal',
  'obstetrics maternal health',
  'anesthesiology pain management',
  'infectious disease antimicrobial',
  'rheumatology autoimmune',
  'hematology blood disorders',
  'clinical trials methodology',
  'nursing practice evidence-based',
  'pharmacy drug interactions',
  'physical therapy rehabilitation',
  'public health epidemiology',
  'health informatics EHR',
  'telemedicine remote monitoring',
  'surgical robotics minimally invasive',
  'palliative care quality of life',
  'vaccine development clinical',
];

async function searchPubMed(topic: string, retmax: number): Promise<string[]> {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(topic)}&retmax=${retmax}&retmode=json&sort=date`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.esearchresult?.idlist || [];
  } catch {
    return [];
  }
}

async function fetchPubMedDetails(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.result || {};
    
    const authorMap = new Map<string, any>();
    
    for (const id of ids) {
      const article = results[id];
      if (!article || !article.authors) continue;

      for (const author of article.authors) {
        if (!author.name || author.name.length < 3) continue;
        const key = author.name.toLowerCase();
        if (authorMap.has(key)) continue;

        authorMap.set(key, {
          fullName: author.name,
          title: 'Medical Researcher',
          company: '',
          headline: `Published: "${(article.title || '').slice(0, 100)}" (${article.pubdate || ''})`,
          bio: `Biomedical researcher. Published "${article.title}" in ${article.fulljournalname || article.source || 'peer-reviewed journal'} (${article.pubdate || ''}).`,
          location: '',
          emails: [],
          phones: [],
          skills: ['Medicine', 'Biomedical Research', 'Healthcare'],
          socialLinks: [
            { platform: 'PubMed', url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, handle: id },
          ],
          sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          sourceDomain: 'pubmed.ncbi.nlm.nih.gov',
        });
      }
    }
    
    return Array.from(authorMap.values());
  } catch (err: any) {
    console.error(`[PubMed Worker] Error fetching details:`, err.message);
    return [];
  }
}

async function main() {
  const topicIndex = parseInt(process.argv[2] || '0', 10);
  const limit = parseInt(process.argv[3] || '30', 10);

  const topic = TOPICS[topicIndex % TOPICS.length];
  console.log(`[PubMed Worker] Topic: "${topic}"`);

  const ids = await searchPubMed(topic, limit);
  console.log(`[PubMed Worker] Found ${ids.length} articles`);

  // Fetch in batches of 50 (API limit)
  const allProfiles: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const profiles = await fetchPubMedDetails(batch);
    allProfiles.push(...profiles);
    await new Promise(r => setTimeout(r, 400)); // Rate limit
  }

  console.log(`[PubMed Worker] Built ${allProfiles.length} author profiles for "${topic}"`);

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
      console.log(`[PubMed Worker] Batch ${Math.floor(i/50)+1}: ${JSON.stringify(result).slice(0, 200)}`);
    } catch (err: any) {
      console.error(`[PubMed Worker] Batch failed:`, err.message);
    }
  }
}

main().catch(console.error);
