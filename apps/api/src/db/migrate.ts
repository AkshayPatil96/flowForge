// CLI: pnpm db:migrate
import { loadConfig } from '../config.js';
import { Database } from './database.js';
import { migrateToLatest } from './migrator.js';

const database = new Database(loadConfig().databaseUrl);
try {
  const applied = await migrateToLatest(database.db);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date');
} finally {
  await database.db.destroy();
}
