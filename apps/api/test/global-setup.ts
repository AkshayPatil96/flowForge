import { Database } from '../src/db/database.js';
import { migrateToLatest } from '../src/db/migrator.js';

// Bring the test database schema up to date once per run. Safe when several
// CI runs share the database: migrations are serialized by an advisory lock.
export default async function setup(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const database = new Database(url);
  try {
    await migrateToLatest(database.db);
  } finally {
    await database.db.destroy();
  }
}
