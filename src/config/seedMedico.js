import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from './db.js';

async function seedMedico() {
  const [nombre, apellido, mail, dni, contrasena] = process.argv.slice(2);

  if (!nombre || !apellido || !mail || !dni || !contrasena) {
    console.error('Uso: npm run seed:medico -- <nombre> <apellido> <mail> <dni> <contrasena>');
    process.exit(1);
  }

  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  const existente = await pool.query('SELECT auth_user_id FROM medicos WHERE mail = $1', [mail]);
  let authUserId = existente.rows[0]?.auth_user_id;

  if (authUserId) {
    await pool.query('UPDATE "user" SET name = $1 WHERE id = $2', [`${nombre} ${apellido}`, authUserId]);
    await pool.query('UPDATE account SET password = $1, "updatedAt" = NOW() WHERE "userId" = $2', [
      contrasenaHash,
      authUserId,
    ]);
  } else {
    authUserId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, TRUE, 'medico', NOW(), NOW())`,
      [authUserId, `${nombre} ${apellido}`, mail]
    );
    await pool.query(
      `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $2, $3, NOW(), NOW())`,
      [crypto.randomUUID(), authUserId, contrasenaHash]
    );
  }

  await pool.query(
    `INSERT INTO medicos (nombre, apellido, mail, contrasena, dni, verificado, auth_user_id)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)
     ON CONFLICT (mail) DO UPDATE SET contrasena = EXCLUDED.contrasena, auth_user_id = EXCLUDED.auth_user_id`,
    [nombre, apellido, mail, contrasenaHash, dni, authUserId]
  );

  console.log(`Médico ${mail} creado/actualizado correctamente.`);
  await pool.end();
}

seedMedico().catch((err) => {
  console.error('Error al crear el médico:', err.message);
  process.exit(1);
});
