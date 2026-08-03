#!/usr/bin/env node
/**
 * Restore profiles from backup JSON into PostgreSQL via direct DB connection.
 * 
 * Usage: node scripts/restore-from-backup.js /path/to/profiles_latest.json
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:q12TsGbTSZpxrWfNrFlI7k3tsQW0jWP2BiDHkAVhVvoDuCMu4xOrZbw8F2r7yu5b@porozj7lezx4afl3ld1nr2zz:5432/postgres';

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: node scripts/restore-from-backup.js <backup-json-file>');
  process.exit(1);
}

async function restore() {
  console.log(`[Restore] Reading backup from: ${backupFile}`);
  const raw = fs.readFileSync(backupFile, 'utf-8');
  const data = JSON.parse(raw);
  const profiles = data.data || data;
  console.log(`[Restore] Found ${profiles.length} profiles to restore.`);

  const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });

  // Ensure table exists
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    try { await client.query(`CREATE EXTENSION IF NOT EXISTS "vector";`); } catch {}
    
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
        sources JSONB DEFAULT '[]',
        avatar_url TEXT,
        match_confidence DOUBLE PRECISION DEFAULT 1.0,
        tags TEXT[] DEFAULT '{}',
        outreach_status TEXT DEFAULT 'uncontacted',
        extraction_method TEXT,
        dedup_method TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Restore] Schema verified.');
  } finally {
    client.release();
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    const batchClient = await pool.connect();
    
    try {
      await batchClient.query('BEGIN');
      
      for (const p of batch) {
        try {
          await batchClient.query(
            `INSERT INTO canonical_people 
              (id, full_name, headline, bio, primary_email, emails, phones, current_company, current_title, location, skills, social_links, sources, avatar_url, match_confidence, tags, outreach_status, extraction_method, dedup_method, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
             ON CONFLICT (id) DO NOTHING`,
            [
              p.id,
              p.fullName || 'Unknown',
              p.headline || '',
              p.bio || '',
              p.primaryEmail || '',
              p.emails || [],
              p.phones || [],
              p.currentCompany || '',
              p.currentTitle || '',
              p.location || '',
              p.skills || [],
              JSON.stringify(p.socialLinks || []),
              JSON.stringify(p.sources || []),
              p.avatarUrl || '',
              p.matchConfidence || 1.0,
              p.tags || [],
              p.outreachStatus || 'uncontacted',
              p.extractionMethod || 'ai-luna',
              p.dedupMethod || 'no-match-new',
              p.createdAt || new Date().toISOString(),
              p.updatedAt || new Date().toISOString(),
            ]
          );
          inserted++;
        } catch (err) {
          errors++;
          if (errors <= 3) console.error(`[Restore] Error on "${p.fullName}":`, err.message);
        }
      }
      
      await batchClient.query('COMMIT');
      process.stdout.write(`\r[Restore] Progress: ${inserted + skipped + errors}/${profiles.length} (inserted: ${inserted}, errors: ${errors})`);
    } catch (err) {
      await batchClient.query('ROLLBACK');
      console.error(`\n[Restore] Batch error:`, err.message);
    } finally {
      batchClient.release();
    }
  }

  console.log(`\n[Restore] ✅ Complete. Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);
  
  // Verify
  const verifyClient = await pool.connect();
  try {
    const res = await verifyClient.query('SELECT COUNT(*) as total FROM canonical_people');
    console.log(`[Restore] Verified: ${res.rows[0].total} profiles in PostgreSQL.`);
  } finally {
    verifyClient.release();
  }

  await pool.end();
}

restore().catch(err => {
  console.error('[Restore] FATAL:', err);
  process.exit(1);
});
