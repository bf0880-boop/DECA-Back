import bcrypt from 'bcryptjs';
import pool from './db.js';

async function seedAdmin() {
  const [nombre, apellido, mail, contrasena] = process.argv.slice(2);

  if (!nombre || !apellido || !mail || !contrasena) {
    console.error('Uso: npm run seed:admin -- <nombre> <apellido> <mail> <contrasena>');
    process.exit(1);
  }

  const contrasenaHash = await bcrypt.hash(contrasena, 10);
  await pool.query(
    `INSERT INTO admins (nombre, apellido, mail, contrasena, verificado)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (mail) DO UPDATE SET contrasena = EXCLUDED.contrasena`,
    [nombre, apellido, mail, contrasenaHash]
  );

  console.log(`Admin ${mail} creado/actualizado correctamente.`);
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error('Error al crear el admin:', err.message);
  process.exit(1);
});
