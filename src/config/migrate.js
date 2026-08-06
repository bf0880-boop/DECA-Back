const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Migracion aplicada correctamente.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Error al migrar:', err.message);
  process.exit(1);
});
