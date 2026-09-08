import crypto from 'crypto';
import pool from './db.js';

const TABLAS = [
  { tabla: 'pacientes', role: 'paciente' },
  { tabla: 'medicos', role: 'medico' },
  { tabla: 'admins', role: 'admin' },
];

async function backfill() {
  for (const { tabla, role } of TABLAS) {
    const { rows } = await pool.query(
      `SELECT id, nombre, apellido, mail, contrasena FROM ${tabla} WHERE auth_user_id IS NULL`
    );

    for (const fila of rows) {
      const authUserId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, TRUE, $4, NOW(), NOW())`,
        [authUserId, `${fila.nombre} ${fila.apellido}`, fila.mail, role]
      );

      await pool.query(
        `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $2, $3, NOW(), NOW())`,
        [crypto.randomUUID(), authUserId, fila.contrasena]
      );

      await pool.query(`UPDATE ${tabla} SET auth_user_id = $1 WHERE id = $2`, [authUserId, fila.id]);

      console.log(`${tabla}: ${fila.mail} -> auth_user_id ${authUserId}`);
    }

    console.log(`${tabla}: ${rows.length} cuenta(s) migrada(s).`);
  }

  await pool.end();
}

backfill().catch((err) => {
  console.error('Error en el backfill de better-auth:', err.message);
  process.exit(1);
});
