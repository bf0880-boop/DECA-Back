const pool = require('../config/db');

async function crear({ nombre, apellido, mail, contrasenaHash, fechaNacimiento, dni, obraSocial }) {
  const result = await pool.query(
    `INSERT INTO pacientes (nombre, apellido, mail, contrasena, fecha_nacimiento, dni, obra_social)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social, verificado, created_at`,
    [nombre, apellido, mail, contrasenaHash, fechaNacimiento, dni, obraSocial || null]
  );
  return result.rows[0];
}

async function buscarPorMail(mail) {
  const result = await pool.query('SELECT * FROM pacientes WHERE mail = $1', [mail]);
  return result.rows[0] || null;
}

module.exports = { crear, buscarPorMail };
