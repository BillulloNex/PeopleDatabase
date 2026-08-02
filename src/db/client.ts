import { Pool } from 'pg';
import { MeiliSearch } from 'meilisearch';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/peopledatabase';
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_KEY || '';

export const dbPool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const meili = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_KEY,
});

export interface PersonRecord {
  id: string;
  fullName: string;
  headline?: string;
  bio?: string;
  primaryEmail?: string;
  emails: string[];
  phones: string[];
  currentCompany?: string;
  currentTitle?: string;
  location?: string;
  skills: string[];
  socialLinks: { platform: string; url: string; handle?: string }[];
  avatarUrl?: string;
  matchConfidence: number;
  tags: string[];
  outreachStatus: 'uncontacted' | 'in_sequence' | 'replied' | 'do_not_contact';
  createdAt: string;
  updatedAt: string;
}

/**
 * Ensures PostgreSQL tables & pgvector extension are created if not present.
 */
export async function initDatabaseSchema(): Promise<void> {
  const client = await dbPool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "vector";`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS canonical_people (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name TEXT NOT NULL,
        headline TEXT,
        bio TEXT,
        primary_email TEXT,
        emails TEXT[] DEFAULT '{}',
        phones TEXT[] DEFAULT '{}',
        current_company TEXT,
        current_title TEXT,
        location TEXT,
        skills TEXT[] DEFAULT '{}',
        social_links JSONB DEFAULT '[]',
        avatar_url TEXT,
        match_confidence DOUBLE PRECISION DEFAULT 1.0,
        tags TEXT[] DEFAULT '{}',
        outreach_status TEXT DEFAULT 'uncontacted',
        embedding vector(1536),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS raw_profile_sources (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        canonical_person_id UUID REFERENCES canonical_people(id) ON DELETE CASCADE,
        source_domain TEXT NOT NULL,
        source_url TEXT NOT NULL,
        raw_payload JSONB,
        ingested_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS outreach_lists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        person_ids UUID[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Database] Schema initialization complete.');
  } catch (err) {
    console.warn('[Database] Schema initialization notice (fallback mode active):', err);
  } finally {
    client.release();
  }
}
