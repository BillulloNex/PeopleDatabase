import { dbPool, meili, PersonRecord } from '../db/client';
import { ExtractedPersonProfile, evaluateEntityMergeWithAI } from '../lib/openrouter';

// In-memory fallback store for zero-config local testing and development
const memoryStore: Map<string, PersonRecord> = new Map();

// Initialize mock seed profiles if empty
seedMockDataIfEmpty();

function seedMockDataIfEmpty() {
  if (memoryStore.size === 0) {
    const seedPeople: PersonRecord[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        fullName: 'Alex Vance',
        headline: 'Founder & CEO @ AI Nexus',
        bio: 'Building autonomous agent infrastructure. Ex-Google Brain, Stanford CS.',
        primaryEmail: 'alex.vance@ainexus.io',
        emails: ['alex.vance@ainexus.io', 'alexvance.dev@gmail.com'],
        phones: ['+1-415-555-0192'],
        currentCompany: 'AI Nexus',
        currentTitle: 'Founder & CEO',
        location: 'San Francisco, CA',
        skills: ['Python', 'TypeScript', 'PyTorch', 'Distributed Systems', 'LLMs'],
        socialLinks: [
          { platform: 'github', url: 'https://github.com/torvalds', handle: 'torvalds' }
        ],
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        matchConfidence: 0.98,
        tags: ['YC Founder', 'AI Infrastructure', 'Series A'],
        outreachStatus: 'uncontacted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        fullName: 'Elena Rostova',
        headline: 'Staff Rust & Systems Engineer @ HyperCloud',
        bio: 'Core contributor to high-throughput async network runtimes and memory-safe databases.',
        primaryEmail: 'elena@hypercloud.dev',
        emails: ['elena@hypercloud.dev', 'elena.rostova@rust.org'],
        phones: [],
        currentCompany: 'HyperCloud',
        currentTitle: 'Staff Systems Engineer',
        location: 'Seattle, WA',
        skills: ['Rust', 'C++', 'Linux Kernel', 'eBPF', 'Tokio'],
        socialLinks: [
          { platform: 'github', url: 'https://github.com/erostova', handle: 'erostova' },
          { platform: 'twitter', url: 'https://x.com/rust_elena', handle: 'rust_elena' }
        ],
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        matchConfidence: 0.95,
        tags: ['Systems Core', 'Rust Community', 'Key Speaker'],
        outreachStatus: 'in_sequence',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        fullName: 'David K. Chen',
        headline: 'VP of Growth & Data Analytics @ Lumina Health',
        bio: 'Scaling healthcare tech from 0 to 10M users. Data-driven growth frameworks.',
        primaryEmail: 'dchen@luminahealth.com',
        emails: ['dchen@luminahealth.com'],
        phones: ['+1-212-555-0143'],
        currentCompany: 'Lumina Health',
        currentTitle: 'VP of Growth',
        location: 'New York, NY',
        skills: ['Growth Hacking', 'SQL', 'Mixpanel', 'B2B Sales', 'HubSpot'],
        socialLinks: [
          { platform: 'linkedin', url: 'https://linkedin.com/in/davidkchen', handle: 'davidkchen' }
        ],
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        matchConfidence: 0.92,
        tags: ['HealthTech', 'VP Growth', 'NYC Tech'],
        outreachStatus: 'replied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    seedPeople.forEach((p) => memoryStore.set(p.id, p));
  }
}

/**
 * Searches stored canonical people using query filters, skills, location, or full text.
 */
export async function searchCanonicalPeople(params: {
  query?: string;
  skill?: string;
  company?: string;
  location?: string;
  status?: string;
}): Promise<PersonRecord[]> {
  // Try Postgres query first if DB connected
  try {
    const client = await dbPool.connect();
    try {
      let sql = 'SELECT * FROM canonical_people WHERE 1=1';
      const values: any[] = [];
      let idx = 1;

      if (params.query) {
        sql += ` AND (full_name ILIKE $${idx} OR headline ILIKE $${idx} OR bio ILIKE $${idx})`;
        values.push(`%${params.query}%`);
        idx++;
      }
      if (params.company) {
        sql += ` AND current_company ILIKE $${idx}`;
        values.push(`%${params.company}%`);
        idx++;
      }
      if (params.location) {
        sql += ` AND location ILIKE $${idx}`;
        values.push(`%${params.location}%`);
        idx++;
      }
      if (params.skill) {
        sql += ` AND $${idx} = ANY(skills)`;
        values.push(params.skill);
        idx++;
      }

      sql += ' ORDER BY created_at DESC LIMIT 50';
      const res = await client.query(sql, values);
      if (res.rows.length > 0) {
        return res.rows.map(rowToPersonRecord);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    // DB offline/unavailable -> Fallback to in-memory store
  }

  // Memory store fallback filtering
  let results = Array.from(memoryStore.values());

  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.headline && p.headline.toLowerCase().includes(q)) ||
        (p.bio && p.bio.toLowerCase().includes(q)) ||
        p.skills.some((s) => s.toLowerCase().includes(q)) ||
        (p.currentCompany && p.currentCompany.toLowerCase().includes(q))
    );
  }

  if (params.company) {
    const c = params.company.toLowerCase();
    results = results.filter((p) => p.currentCompany && p.currentCompany.toLowerCase().includes(c));
  }

  if (params.location) {
    const l = params.location.toLowerCase();
    results = results.filter((p) => p.location && p.location.toLowerCase().includes(l));
  }

  if (params.skill) {
    const s = params.skill.toLowerCase();
    results = results.filter((p) => p.skills.some((sk) => sk.toLowerCase().includes(s)));
  }

  if (params.status) {
    results = results.filter((p) => p.outreachStatus === params.status);
  }

  return results;
}

/**
 * Gets a single person record by UUID.
 */
export async function getPersonById(id: string): Promise<PersonRecord | null> {
  try {
    const client = await dbPool.connect();
    try {
      const res = await client.query('SELECT * FROM canonical_people WHERE id = $1', [id]);
      if (res.rows[0]) return rowToPersonRecord(res.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    // fallback
  }

  return memoryStore.get(id) || null;
}

/**
 * Upserts a newly extracted profile into the database with entity resolution.
 */
export async function upsertExtractedProfile(extracted: ExtractedPersonProfile): Promise<PersonRecord> {
  const existingList = Array.from(memoryStore.values());
  
  // Rule 1: Check exact email match
  let match = existingList.find((p) =>
    p.emails.some((e) => extracted.emails.map(x => x.toLowerCase()).includes(e.toLowerCase()))
  );

  // Rule 2: If no email match, check full name + company match
  if (!match && extracted.fullName && extracted.company) {
    match = existingList.find(
      (p) =>
        p.fullName.toLowerCase() === extracted.fullName.toLowerCase() &&
        p.currentCompany?.toLowerCase() === extracted.company?.toLowerCase()
    );
  }

  // Rule 3: Use GPT-5.6 Terra AI reasoning if ambiguous
  if (!match && extracted.fullName && existingList.length > 0) {
    const candidate = existingList.find(
      (p) => p.fullName.toLowerCase().includes(extracted.fullName.toLowerCase())
    );
    if (candidate) {
      const aiResult = await evaluateEntityMergeWithAI(candidate, extracted);
      if (aiResult.shouldMerge && aiResult.confidenceScore > 0.75) {
        match = candidate;
      }
    }
  }

  const now = new Date().toISOString();

  if (match) {
    // Merge identity records
    const updated: PersonRecord = {
      ...match,
      headline: extracted.headline || match.headline,
      bio: extracted.bio || match.bio,
      emails: Array.from(new Set([...match.emails, ...extracted.emails])),
      currentCompany: extracted.company || match.currentCompany,
      currentTitle: extracted.title || match.currentTitle,
      location: extracted.location || match.location,
      skills: Array.from(new Set([...match.skills, ...extracted.skills])),
      socialLinks: [...match.socialLinks, ...extracted.socialLinks],
      updatedAt: now,
    };

    memoryStore.set(updated.id, updated);
    return updated;
  } else {
    // Create new Canonical Entity
    const newPerson: PersonRecord = {
      id: crypto.randomUUID(),
      fullName: extracted.fullName || 'Unknown Discovered Entity',
      headline: extracted.headline || (extracted.title ? `${extracted.title} @ ${extracted.company || ''}` : ''),
      bio: extracted.bio || '',
      primaryEmail: extracted.emails[0] || '',
      emails: extracted.emails,
      phones: extracted.phones || [],
      currentCompany: extracted.company || '',
      currentTitle: extracted.title || '',
      location: extracted.location || '',
      skills: extracted.skills,
      socialLinks: extracted.socialLinks,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(extracted.fullName || 'Person')}`,
      matchConfidence: 0.9,
      tags: ['New Discovered Entity'],
      outreachStatus: 'uncontacted',
      createdAt: now,
      updatedAt: now,
    };

    memoryStore.set(newPerson.id, newPerson);
    return newPerson;
  }
}

function rowToPersonRecord(row: any): PersonRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    headline: row.headline,
    bio: row.bio,
    primaryEmail: row.primary_email,
    emails: row.emails || [],
    phones: row.phones || [],
    currentCompany: row.current_company,
    currentTitle: row.current_title,
    location: row.location,
    skills: row.skills || [],
    socialLinks: row.social_links || [],
    avatarUrl: row.avatar_url,
    matchConfidence: row.match_confidence || 1.0,
    tags: row.tags || [],
    outreachStatus: row.outreach_status || 'uncontacted',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
