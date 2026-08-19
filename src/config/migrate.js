import fs from 'fs';
import pool from './db.js';

async function migrate() {
  const schema = fs.readFileSync(new URL('schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('Migracion aplicada correctamente.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Error al migrar:', err.message);
  process.exit(1);
});
