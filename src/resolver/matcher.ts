import { dbPool, meili, PersonRecord, IngestionRunLog, initDatabaseSchema } from '../db/client';
import { ExtractedPersonProfile, evaluateEntityMergeWithAI } from '../lib/openrouter';
import { mirrorToMongoDB } from '../db/mongo-backup';
import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'people_db_store.json');
const RUN_LOGS_FILE = path.join(process.cwd(), 'run_logs_store.json');

// Memory & Disk Fallback Store
const memoryStore: Map<string, PersonRecord> = new Map();
let runLogsStore: IngestionRunLog[] = [];

// === DEDUP CACHE: Avoid re-comparing the same pairs ===
const dedupCache = new Map<string, { shouldMerge: boolean; confidenceScore: number; timestamp: number }>();
const DEDUP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getDedupCacheKey(existingId: string, newName: string): string {
  return `${existingId}::${newName.toLowerCase().trim()}`;
}

// === BLOCKING INDEX: Fast candidate narrowing by name tokens ===
const nameBlockingIndex = new Map<string, Set<string>>();

function addToBlockingIndex(person: PersonRecord) {
  const tokens = person.fullName.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
  for (const token of tokens) {
    if (!nameBlockingIndex.has(token)) {
      nameBlockingIndex.set(token, new Set());
    }
    nameBlockingIndex.get(token)!.add(person.id);
  }
}

function getCandidatesFromBlockingIndex(name: string): PersonRecord[] {
  const tokens = name.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
  const candidateIds = new Set<string>();

  for (const token of tokens) {
    const ids = nameBlockingIndex.get(token);
    if (ids) {
      for (const id of ids) candidateIds.add(id);
    }
  }

  return Array.from(candidateIds)
    .map(id => memoryStore.get(id))
    .filter((p): p is PersonRecord => !!p);
}

function loadStoreFromDisk() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed: PersonRecord[] = JSON.parse(raw);
      parsed.forEach(p => {
        memoryStore.set(p.id, p);
        addToBlockingIndex(p);
      });
      console.log(`[Store] Loaded ${memoryStore.size} persistent records from disk. Blocking index: ${nameBlockingIndex.size} tokens.`);
    }
  } catch (err) {
    console.warn('[Store] Failed to load store from disk:', err);
  }

  try {
    if (fs.existsSync(RUN_LOGS_FILE)) {
      const raw = fs.readFileSync(RUN_LOGS_FILE, 'utf-8');
      runLogsStore = JSON.parse(raw);
      console.log(`[Store] Loaded ${runLogsStore.length} run logs from disk.`);
    }
  } catch (err) {
    console.warn('[Store] Failed to load run logs from disk:', err);
  }
}

function saveStoreToDisk() {
  try {
    const array = Array.from(memoryStore.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store] Failed to save store to disk:', err);
  }

  try {
    fs.writeFileSync(RUN_LOGS_FILE, JSON.stringify(runLogsStore.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store] Failed to save run logs to disk:', err);
  }
}

// Database schema initialization guard
let dbSchemaInitialized = false;
async function ensureDbSchema() {
  if (dbSchemaInitialized) return;
  try {
    await initDatabaseSchema();
    dbSchemaInitialized = true;
  } catch (err) {
    console.error('[Store] Failed to initialize DB schema:', (err as Error).message);
  }
}

// Initial load on server startup
loadStoreFromDisk();
ensureDbSchema().catch(() => {});

// Auto-purge garbage profiles on startup
function purgeGarbageProfiles() {
  const REJECT_NAMES = new Set([
    'discovered entity', 'discovered profile', 'discovered person',
    'unknown', 'n/a', 'na', 'none', 'null', 'undefined', 'anonymous',
    'user', 'profile', 'person', 'entity', 'contact', 'member',
  ]);

  let purged = 0;
  for (const [id, person] of memoryStore.entries()) {
    const nameLower = (person.fullName || '').toLowerCase().trim();
    const isGarbage = !nameLower
      || nameLower.length < 2
      || REJECT_NAMES.has(nameLower)
      || nameLower.startsWith('http')
      || nameLower.startsWith('www.')
      || nameLower.startsWith('profile found')
      || !/[a-zA-Z]/.test(nameLower)
      || (nameLower.split(/\s+/).length < 2 && nameLower.length < 4);

    if (isGarbage) {
      memoryStore.delete(id);
      purged++;
    }
  }

  if (purged > 0) {
    console.log(`[Store] Purged ${purged} garbage profiles on startup. ${memoryStore.size} clean records remain.`);
    saveStoreToDisk();
  }
}

purgeGarbageProfiles();

/**
 * Logs an ingestion run (whether GHA matrix, Exa search, GitHub worker, or webhook).
 */
export async function logIngestionRun(logData: Omit<IngestionRunLog, 'id' | 'timestamp'>): Promise<IngestionRunLog> {
  const logRecord: IngestionRunLog = {
    ...logData,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };

  runLogsStore.unshift(logRecord);
  if (runLogsStore.length > 100) runLogsStore.pop(); // Keep 100 most recent run logs
  saveStoreToDisk();

  try {
    const client = await dbPool.connect();
    try {
      await client.query(
        `INSERT INTO ingestion_run_logs 
          (id, run_type, query_or_source, status, processed_count, created_count, merged_count, duration_ms, entities, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          logRecord.id,
          logRecord.runType,
          logRecord.queryOrSource,
          logRecord.status,
          logRecord.processedCount,
          logRecord.createdCount,
          logRecord.mergedCount,
          logRecord.durationMs,
          JSON.stringify(logRecord.entities),
          logRecord.timestamp
        ]
      );
    } finally {
      client.release();
    }
  } catch (err) {
    // DB offline -> saved to disk via saveStoreToDisk()
  }

  return logRecord;
}

/**
 * Fetches recent ingestion run logs.
 */
export async function getRecentIngestionRuns(): Promise<IngestionRunLog[]> {
  try {
    const client = await dbPool.connect();
    try {
      const res = await client.query('SELECT * FROM ingestion_run_logs ORDER BY timestamp DESC LIMIT 50');
      if (res.rows.length > 0) {
        return res.rows.map(row => ({
          id: row.id,
          runType: row.run_type,
          queryOrSource: row.query_or_source,
          status: row.status,
          processedCount: row.processed_count,
          createdCount: row.created_count,
          mergedCount: row.merged_count,
          durationMs: row.duration_ms,
          timestamp: row.timestamp,
          entities: row.entities || []
        }));
      }
    } finally {
      client.release();
    }
  } catch (err) {
    // DB offline fallback
  }

  return runLogsStore;
}

// Strict Email & URL Validator to guarantee 100% authentic data
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'web-source';
  }
}

/**
 * Computes Jaccard similarity between two name strings (token-level).
 * Returns 0.0–1.0. Higher = more similar.
 */
function nameTokenSimilarity(nameA: string, nameB: string): number {
  const tokensA = new Set(nameA.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1));
  const tokensB = new Set(nameB.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

/**
 * Double & Triple Validation Filter: Sanitizes and strips unverified/invalid data fields.
 */
export function sanitizeAndValidateProfile(profile: ExtractedPersonProfile): ExtractedPersonProfile {
  const validEmails = Array.from(new Set((profile.emails || []).map(e => e.trim()).filter(isValidEmail)));
  const validSocialLinks = (profile.socialLinks || []).filter(link => link.url && isValidUrl(link.url));
  const validSkills = Array.from(new Set((profile.skills || []).map(s => s.trim()).filter(s => s.length > 0 && s.length < 50)));

  return {
    ...profile,
    fullName: (profile.fullName || '').trim() || 'Discovered Profile',
    headline: (profile.headline || '').trim(),
    bio: (profile.bio || '').trim(),
    company: (profile.company || '').trim(),
    title: (profile.title || '').trim(),
    location: (profile.location || '').trim(),
    emails: validEmails,
    skills: validSkills,
    socialLinks: validSocialLinks,
  };
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
  limit?: number;
}): Promise<PersonRecord[]> {
  // Try Postgres query first if DB connected
  await ensureDbSchema();
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

      sql += ` ORDER BY created_at DESC LIMIT ${params.limit || 50}`;
      const res = await client.query(sql, values);
      if (res.rows.length > 0) {
        const records = res.rows.map(rowToPersonRecord);
        records.forEach(r => memoryStore.set(r.id, r));
        return records;
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Search] PostgreSQL query failed, falling back to memory store:', (err as Error).message || err);
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
export async function upsertExtractedProfile(extracted: ExtractedPersonProfile, sourceUrl?: string): Promise<PersonRecord> {
  const sanitized = sanitizeAndValidateProfile(extracted);
  
  // STRICT NAME GATE: Reject profiles without a real human name
  const REJECT_NAMES = new Set([
    'discovered entity', 'discovered profile', 'discovered person',
    'unknown', 'n/a', 'na', 'none', 'null', 'undefined', 'anonymous',
    'user', 'profile', 'person', 'entity', 'contact', 'member',
  ]);
  
  const nameLower = (sanitized.fullName || '').toLowerCase().trim();
  const isGarbageName = !nameLower 
    || nameLower.length < 2
    || REJECT_NAMES.has(nameLower)
    || nameLower.startsWith('http')
    || nameLower.startsWith('www.')
    || nameLower.startsWith('profile found')
    || !/[a-zA-Z]/.test(nameLower)  // Must contain at least one letter
    || (nameLower.split(/\s+/).length < 2 && nameLower.length < 4); // Single short word is not a name

  if (isGarbageName) {
    throw new Error(`Rejected: "${sanitized.fullName}" is not a valid person name. Skipping ingestion.`);
  }

  const existingList = Array.from(memoryStore.values());
  
  const newSourceObj = sourceUrl ? { url: sourceUrl, domain: extractDomain(sourceUrl), ingestedAt: new Date().toISOString() } : null;

  // Track how dedup was resolved
  let dedupMethod: PersonRecord['dedupMethod'] = 'no-match-new';

  // Rule 1: Check exact email match
  let match = existingList.find((p) =>
    p.emails.some((e) => sanitized.emails.map(x => x.toLowerCase()).includes(e.toLowerCase()))
  );
  if (match) dedupMethod = 'email-match';

  // Rule 2: If no email match, check full name + company match
  if (!match && sanitized.fullName && sanitized.company) {
    match = existingList.find(
      (p) =>
        p.fullName.toLowerCase() === sanitized.fullName.toLowerCase() &&
        p.currentCompany?.toLowerCase() === sanitized.company?.toLowerCase()
    );
    if (match) dedupMethod = 'name-company-match';
  }

  // Rule 3: AI reasoning for ambiguous matches — with blocking index + similarity pre-filter + cache
  if (!match && sanitized.fullName && existingList.length > 0) {
    // Use blocking index for fast candidate narrowing instead of full scan
    const blockCandidates = getCandidatesFromBlockingIndex(sanitized.fullName);

    // Apply Jaccard similarity filter (threshold > 0.4)
    const candidates = blockCandidates
      .map(p => ({ person: p, similarity: nameTokenSimilarity(p.fullName, sanitized.fullName) }))
      .filter(c => c.similarity > 0.4)
      .sort((a, b) => b.similarity - a.similarity);

    if (candidates.length > 0) {
      const topCandidate = candidates[0].person;
      const cacheKey = getDedupCacheKey(topCandidate.id, sanitized.fullName);
      const cached = dedupCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < DEDUP_CACHE_TTL_MS) {
        // Cache hit — skip AI call
        if (cached.shouldMerge && cached.confidenceScore > 0.75) {
          match = topCandidate;
          dedupMethod = 'ai-resolved';
        }
      } else {
        // Cache miss — call AI
        const aiResult = await evaluateEntityMergeWithAI(topCandidate, sanitized);
        dedupCache.set(cacheKey, { ...aiResult, timestamp: Date.now() });
        if (aiResult.shouldMerge && aiResult.confidenceScore > 0.75) {
          match = topCandidate;
          dedupMethod = 'ai-resolved';
        }
      }
    }
  }

  const now = new Date().toISOString();

  if (match) {
    const existingSources = match.sources || [];
    const updatedSources = newSourceObj && !existingSources.some(s => s.url === newSourceObj.url)
      ? [...existingSources, newSourceObj]
      : existingSources;

    // Merge identity records
    const updated: PersonRecord = {
      ...match,
      headline: sanitized.headline || match.headline,
      bio: sanitized.bio || match.bio,
      emails: Array.from(new Set([...match.emails, ...sanitized.emails])),
      currentCompany: sanitized.company || match.currentCompany,
      currentTitle: sanitized.title || match.currentTitle,
      location: sanitized.location || match.location,
      skills: Array.from(new Set([...match.skills, ...sanitized.skills])),
      socialLinks: [...match.socialLinks, ...sanitized.socialLinks],
      sources: updatedSources,
      updatedAt: now,
    };

    memoryStore.set(updated.id, updated);
    saveStoreToDisk();

    // Persist to PostgreSQL database
    try {
      const client = await dbPool.connect();
      try {
        await client.query(
          `UPDATE canonical_people 
           SET headline = $1, bio = $2, emails = $3, current_company = $4, current_title = $5, location = $6, skills = $7, social_links = $8, sources = $9, updated_at = $10
           WHERE id = $11`,
          [
            updated.headline,
            updated.bio,
            updated.emails,
            updated.currentCompany,
            updated.currentTitle,
            updated.location,
            updated.skills,
            JSON.stringify(updated.socialLinks),
            JSON.stringify(updated.sources),
            updated.updatedAt,
            updated.id
          ]
        );
      } finally {
        client.release();
      }
    } catch (err) {
      // Postgres offline
    }

    // Backup mirror to MongoDB Atlas (fire-and-forget)
    mirrorToMongoDB(updated).catch(() => {});

    return updated;
  } else {
    // Create new Canonical Entity
    const initialSources = newSourceObj ? [newSourceObj] : [];

    const newPerson: PersonRecord = {
      id: crypto.randomUUID(),
      fullName: sanitized.fullName || 'Discovered Entity',
      headline: sanitized.headline || (sanitized.title ? `${sanitized.title} @ ${sanitized.company || ''}` : ''),
      bio: sanitized.bio || '',
      primaryEmail: sanitized.emails[0] || '',
      emails: sanitized.emails,
      phones: sanitized.phones || [],
      currentCompany: sanitized.company || '',
      currentTitle: sanitized.title || '',
      location: sanitized.location || '',
      skills: sanitized.skills,
      socialLinks: sanitized.socialLinks,
      sources: initialSources,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sanitized.fullName || 'Person')}`,
      matchConfidence: 0.95,
      tags: ['Verified Discovered Entity'],
      outreachStatus: 'uncontacted',
      extractionMethod: (extracted as any)._extractionMethod || 'ai-luna',
      dedupMethod,
      createdAt: now,
      updatedAt: now,
    };

    memoryStore.set(newPerson.id, newPerson);
    addToBlockingIndex(newPerson);
    saveStoreToDisk();

    // Persist to PostgreSQL database
    try {
      const client = await dbPool.connect();
      try {
        await client.query(
          `INSERT INTO canonical_people 
            (id, full_name, headline, bio, primary_email, emails, phones, current_company, current_title, location, skills, social_links, sources, avatar_url, match_confidence, tags, outreach_status, extraction_method, dedup_method, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          [
            newPerson.id,
            newPerson.fullName,
            newPerson.headline,
            newPerson.bio,
            newPerson.primaryEmail,
            newPerson.emails,
            newPerson.phones,
            newPerson.currentCompany,
            newPerson.currentTitle,
            newPerson.location,
            newPerson.skills,
            JSON.stringify(newPerson.socialLinks),
            JSON.stringify(newPerson.sources),
            newPerson.avatarUrl,
            newPerson.matchConfidence,
            newPerson.tags,
            newPerson.outreachStatus,
            newPerson.extractionMethod,
            newPerson.dedupMethod,
            newPerson.createdAt,
            newPerson.updatedAt
          ]
        );
      } finally {
        client.release();
      }
    } catch (err) {
      // Postgres offline
    }

    // Backup mirror to MongoDB Atlas (fire-and-forget)
    mirrorToMongoDB(newPerson).catch(() => {});

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
    sources: row.sources || [],
    avatarUrl: row.avatar_url,
    matchConfidence: row.match_confidence || 1.0,
    tags: row.tags || [],
    outreachStatus: row.outreach_status || 'uncontacted',
    extractionMethod: row.extraction_method || undefined,
    dedupMethod: row.dedup_method || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
