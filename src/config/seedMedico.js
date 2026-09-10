import bcrypt from 'bcryptjs';
import pool from './db.js';

async function seedMedico() {
  const [nombre, apellido, mail, dni, contrasena] = process.argv.slice(2);

  if (!nombre || !apellido || !mail || !dni || !contrasena) {
    console.error('Uso: npm run seed:medico -- <nombre> <apellido> <mail> <dni> <contrasena>');
    process.exit(1);
  }

  const contrasenaHash = await bcrypt.hash(contrasena, 10);
  await pool.query(
    `INSERT INTO medicos (nombre, apellido, mail, contrasena, dni, verificado)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (mail) DO UPDATE SET contrasena = EXCLUDED.contrasena`,
    [nombre, apellido, mail, contrasenaHash, dni]
  );

  console.log(`Médico ${mail} creado/actualizado correctamente.`);
  await pool.end();
}

seedMedico().catch((err) => {
  console.error('Error al crear el médico:', err.message);
  process.exit(1);
});
