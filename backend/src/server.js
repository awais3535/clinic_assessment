import { app } from './app.js';
import { config, validateConfig } from './config.js';
import { pool } from './db.js';
validateConfig();
await pool.query('SELECT 1');
const server = app.listen(config.port, '0.0.0.0', () =>
  console.log(`Clinic API listening on http://localhost:${config.port}`),
);
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
