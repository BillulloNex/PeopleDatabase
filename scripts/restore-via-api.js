#!/usr/bin/env node
/**
 * Restore profiles from backup JSON into PeopleDatabase via the /api/ingest/bulk endpoint.
 * This goes through the live app so we don't need direct DB access.
 * 
 * Usage: node scripts/restore-via-api.js /path/to/profiles_latest.json
 */

const fs = require('fs');

const API_URL = process.env.API_URL || 'http://people.beenex.org';
const WEBHOOK_SECRET = process.env.INGESTION_WEBHOOK_SECRET || '';
const BATCH_SIZE = 25;

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: node scripts/restore-via-api.js <backup-json-file>');
  process.exit(1);
}

async function restore() {
  console.log(`[Restore] Reading backup from: ${backupFile}`);
  const raw = fs.readFileSync(backupFile, 'utf-8');
  const data = JSON.parse(raw);
  const profiles = data.data || data;
  console.log(`[Restore] Found ${profiles.length} profiles to restore.`);

  // The bulk endpoint expects { items: [...] } where each item has raw text.
  // But we already have structured profiles. We need a direct DB insert endpoint.
  // Let's use a custom restore endpoint instead.
  
  // First, check if the restore endpoint exists
  const healthRes = await fetch(`${API_URL}/api/health`);
  const health = await healthRes.json();
  console.log(`[Restore] API status: ${health.status}`);

  // Use the restore endpoint
  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    
    try {
      const res = await fetch(`${API_URL}/api/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(WEBHOOK_SECRET ? { 'Authorization': `Bearer ${WEBHOOK_SECRET}` } : {}),
        },
        body: JSON.stringify({ profiles: batch }),
      });
      
      const result = await res.json();
      if (result.success) {
        totalInserted += result.inserted || batch.length;
      } else {
        totalErrors += batch.length;
        if (totalErrors <= 75) console.error(`[Restore] Batch error:`, result.error);
      }
    } catch (err) {
      totalErrors += batch.length;
      console.error(`[Restore] Network error:`, err.message);
    }

    process.stdout.write(`\r[Restore] Progress: ${i + batch.length}/${profiles.length} (inserted: ${totalInserted}, errors: ${totalErrors})`);
    
    // Small delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n[Restore] ✅ Complete. Inserted: ${totalInserted}, Errors: ${totalErrors}`);
  
  // Verify
  const verifyRes = await fetch(`${API_URL}/api/debug/db`);
  const verify = await verifyRes.json();
  console.log(`[Restore] Verified: ${verify.totalProfiles} profiles in PostgreSQL.`);
}

restore().catch(err => {
  console.error('[Restore] FATAL:', err);
  process.exit(1);
});
