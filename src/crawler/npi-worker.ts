export {};
/**
 * NPI Registry Worker — US Healthcare Providers
 * 
 * The NPI (National Provider Identifier) Registry is a FREE public API
 * from CMS.gov containing 7+ million US healthcare providers.
 * No API key required. No rate limits (be polite).
 * 
 * Usage: npx tsx src/crawler/npi-worker.ts <specialty_index> <limit>
 */

const API_BASE = 'https://npiregistry.cms.hhs.gov/api/?version=2.1';
const INGEST_URL = process.env.INGEST_URL || 'http://people.beenex.org/api/ingest/bulk';

const SPECIALTIES = [
  'Internal Medicine',
  'Family Medicine',
  'Cardiology',
  'Orthopedic Surgery',
  'Dermatology',
  'Psychiatry',
  'Pediatrics',
  'Neurology',
  'Oncology',
  'Radiology',
  'Emergency Medicine',
  'Anesthesiology',
  'Obstetrics & Gynecology',
  'Ophthalmology',
  'Gastroenterology',
  'Pulmonary Disease',
  'Nephrology',
  'Endocrinology',
  'Urology',
  'General Surgery',
  'Plastic Surgery',
  'Nurse Practitioner',
  'Physician Assistant',
  'Physical Therapist',
  'Dentist',
  'Pharmacist',
  'Optometrist',
  'Chiropractor',
  'Podiatrist',
  'Clinical Psychologist',
];

const STATES = [
  'NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI',
  'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI',
  'CO', 'MN', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'UT',
];

interface NPIResult {
  result_count: number;
  results: Array<{
    number: number;
    basic: {
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      credential?: string;
      sole_proprietor?: string;
      gender?: string;
      enumeration_date?: string;
      name_prefix?: string;
      organization_name?: string;
    };
    addresses: Array<{
      address_purpose: string;
      address_1: string;
      city: string;
      state: string;
      postal_code: string;
      telephone_number?: string;
    }>;
    taxonomies: Array<{
      code: string;
      desc: string;
      primary: boolean;
      state?: string;
      license?: string;
    }>;
  }>;
}

async function fetchNPIProviders(specialty: string, state: string, limit: number): Promise<any[]> {
  const params = new URLSearchParams({
    taxonomy_description: specialty,
    state,
    limit: String(Math.min(limit, 200)), // API max is 200
    enumeration_type: 'NPI-1', // Individual providers only
  });

  const url = `${API_BASE}&${params.toString()}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data: NPIResult = await res.json();
    if (!data.results) return [];

    return data.results
      .filter(r => r.basic?.first_name && r.basic?.last_name)
      .map(r => {
        const practiceAddr = r.addresses?.find(a => a.address_purpose === 'LOCATION') || r.addresses?.[0];
        const primaryTaxonomy = r.taxonomies?.find(t => t.primary) || r.taxonomies?.[0];
        const fullName = [r.basic.name_prefix, r.basic.first_name, r.basic.middle_name, r.basic.last_name]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const credential = r.basic.credential ? `, ${r.basic.credential}` : '';

        return {
          fullName: `${fullName}${credential}`,
          title: primaryTaxonomy?.desc || specialty,
          company: r.basic.organization_name || '',
          headline: `${primaryTaxonomy?.desc || specialty} — NPI #${r.number}`,
          bio: `Licensed ${primaryTaxonomy?.desc || specialty} healthcare provider. NPI: ${r.number}. ${practiceAddr ? `Practice location: ${practiceAddr.city}, ${practiceAddr.state}` : ''}`.trim(),
          location: practiceAddr ? `${practiceAddr.city}, ${practiceAddr.state} ${practiceAddr.postal_code?.slice(0, 5)}` : '',
          emails: [],
          phones: practiceAddr?.telephone_number ? [practiceAddr.telephone_number] : [],
          skills: [specialty, 'Healthcare', 'Medical'],
          socialLinks: [{ platform: 'NPI Registry', url: `https://npiregistry.cms.hhs.gov/provider-view/${r.number}`, handle: String(r.number) }],
          sourceUrl: `https://npiregistry.cms.hhs.gov/provider-view/${r.number}`,
          sourceDomain: 'npiregistry.cms.hhs.gov',
        };
      });
  } catch (err: any) {
    console.error(`[NPI Worker] Error fetching ${specialty} in ${state}:`, err.message);
    return [];
  }
}

async function main() {
  const specIndex = parseInt(process.argv[2] || '0', 10);
  const limit = parseInt(process.argv[3] || '50', 10);

  // Each job covers one specialty across multiple states
  const specialty = SPECIALTIES[specIndex % SPECIALTIES.length];
  console.log(`[NPI Worker] Specialty: "${specialty}", fetching from ${STATES.length} states`);

  const allProfiles: any[] = [];

  for (const state of STATES) {
    const profiles = await fetchNPIProviders(specialty, state, limit);
    allProfiles.push(...profiles);
    
    // Be polite — small delay between requests
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`[NPI Worker] Built ${allProfiles.length} provider profiles for "${specialty}"`);

  if (allProfiles.length === 0) {
    console.log('[NPI Worker] No profiles found.');
    return;
  }

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
      console.log(`[NPI Worker] Batch ${Math.floor(i/50)+1}: ${JSON.stringify(result).slice(0, 200)}`);
    } catch (err: any) {
      console.error(`[NPI Worker] Batch send failed:`, err.message);
    }
  }

  console.log(`[NPI Worker] Finished. ${allProfiles.length} providers for "${specialty}".`);
}

main().catch(console.error);
