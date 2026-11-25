import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });
pool.on('error', (error) => console.error('Database pool error:', error.message));
export async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
