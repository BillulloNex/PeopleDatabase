/**
 * MongoDB Atlas Backup Mirror
 * 
 * Dual-writes every profile to MongoDB Atlas as a real-time backup.
 * If MongoDB is unreachable, it logs a warning but NEVER blocks the primary write.
 */

import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'peopledatabase';
const COLLECTION_NAME = 'profiles';

let client: MongoClient | null = null;
let db: Db | null = null;
let collection: Collection | null = null;
let connectionFailed = false;

async function getCollection(): Promise<Collection | null> {
  if (connectionFailed || !MONGODB_URI) return null;
  if (collection) return collection;

  try {
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    
    // Create indexes for fast lookups
    await collection.createIndex({ fullName: 1 });
    await collection.createIndex({ 'sources.url': 1 });
    await collection.createIndex({ createdAt: -1 });
    
    console.log('[MongoDB Backup] Connected to Atlas backup mirror.');
    return collection;
  } catch (err: any) {
    console.warn('[MongoDB Backup] Connection failed (backup disabled):', err.message);
    connectionFailed = true;
    return null;
  }
}

/**
 * Mirror a profile to MongoDB Atlas.
 * Fire-and-forget — never blocks primary PostgreSQL write.
 */
export async function mirrorToMongoDB(profile: Record<string, any>): Promise<void> {
  try {
    const col = await getCollection();
    if (!col) return;

    await col.updateOne(
      { id: profile.id },
      { 
        $set: {
          ...profile,
          _mirroredAt: new Date(),
        },
        $setOnInsert: {
          _firstMirroredAt: new Date(),
        }
      },
      { upsert: true }
    );
  } catch (err: any) {
    // Never block the primary write path
    console.warn('[MongoDB Backup] Mirror failed (non-fatal):', err.message);
  }
}

/**
 * Bulk mirror multiple profiles at once.
 */
export async function bulkMirrorToMongoDB(profiles: Record<string, any>[]): Promise<void> {
  try {
    const col = await getCollection();
    if (!col || profiles.length === 0) return;

    const ops = profiles.map(profile => ({
      updateOne: {
        filter: { id: profile.id },
        update: {
          $set: {
            ...profile,
            _mirroredAt: new Date(),
          },
          $setOnInsert: {
            _firstMirroredAt: new Date(),
          }
        },
        upsert: true,
      }
    }));

    const result = await col.bulkWrite(ops, { ordered: false });
    console.log(`[MongoDB Backup] Mirrored ${result.upsertedCount} new + ${result.modifiedCount} updated profiles.`);
  } catch (err: any) {
    console.warn('[MongoDB Backup] Bulk mirror failed (non-fatal):', err.message);
  }
}

/**
 * Get total count from MongoDB backup (for verification).
 */
export async function getMongoBackupCount(): Promise<number> {
  try {
    const col = await getCollection();
    if (!col) return -1;
    return await col.countDocuments();
  } catch {
    return -1;
  }
}
