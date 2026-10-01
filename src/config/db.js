import net from 'net';
import { Pool } from 'pg';
import env from './env.js';

net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const pool = new Pool(env.db);

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err.message);
});

export default pool;