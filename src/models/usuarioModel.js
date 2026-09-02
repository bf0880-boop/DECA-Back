import pool from '../config/db.js';

async function crear({ nombre, apellido, mail, contrasenaHash, fechaNacimiento, dni, obraSocial }) {
  const result = await pool.query(
    `INSERT INTO pacientes (nombre, apellido, mail, contrasena, fecha_nacimiento, dni, obra_social)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social,
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
    `SELECT id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social, medico_id,
       to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS created_at
     FROM pacientes WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listarTodos() {
  const result = await pool.query(
    `SELECT id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social, medico_id,
       to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS created_at
     FROM pacientes ORDER BY apellido, nombre`
  );
  return result.rows;
}

async function listarPorMedico(medicoId) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social, medico_id,
       to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS created_at
     FROM pacientes WHERE medico_id = $1 ORDER BY apellido, nombre`,
    [medicoId]
  );
  return result.rows;
}

async function asignarMedico(id, medicoId) {
  const result = await pool.query(
    `UPDATE pacientes SET medico_id = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, nombre, apellido, mail, fecha_nacimiento, dni, obra_social, medico_id`,
    [medicoId || null, id]
  );
  return result.rows[0] || null;
}

export default { crear, buscarPorMail, buscarPorId, listarTodos, listarPorMedico, asignarMedico };
