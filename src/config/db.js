const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool(env.db);

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err.message);
});

module.exports = pool;