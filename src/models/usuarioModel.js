const pool = require('../config/db');

async function crear({ nombre, apellido, mail, contrasenaHash, fechaNacimiento, dni, obraSocial }) {
  const result = await pool.query(
    `INSERT INTO pacientes (nombre, apellido, mail, contrasena, fecha_nacimiento, dni, obra_social)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social, verificado,
       to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS created_at`,
    [nombre, apellido, mail, contrasenaHash, fechaNacimiento, dni, obraSocial || null]
  );
  return result.rows[0];
}

async function buscarPorMail(mail) {
  const result = await pool.query('SELECT * FROM pacientes WHERE mail = $1', [mail]);
  return result.rows[0] || null;
}

async function buscarPorId(id) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social, verificado,
       to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS created_at
     FROM pacientes WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { crear, buscarPorMail, buscarPorId };
