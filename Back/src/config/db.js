import { Pool } from 'pg';
import env from './env.js';

const pool = new Pool(env.db);

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err.message);
});

export default pool;