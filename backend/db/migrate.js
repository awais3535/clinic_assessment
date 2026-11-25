import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool, transaction } from '../src/db.js';
export async function migrate() {
  const sql = await readFile(new URL('./001_initial.sql', import.meta.url), 'utf8');
  await transaction(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(74819001)');
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())');
    const existing = await db.query('SELECT 1 FROM schema_migrations WHERE name=$1', ['001_initial']);
    if (!existing.rowCount) {
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations(name) VALUES($1)', ['001_initial']);
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await migrate(); console.log('Database migrations complete.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.end(); }
}
