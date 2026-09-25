import pool from '../config/db.js';

async function crearOauth({ nombre, apellido, mail, contrasena, oauthProvider, oauthId, dni, matricula }) {
  const result = await pool.query(
    `INSERT INTO medicos (nombre, apellido, mail, contrasena, dni, matricula, verificado, oauth_provider, oauth_id, mail_verificado)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, TRUE)
     RETURNING id, nombre, apellido, mail, dni, matricula, verificado, mail_verificado`,
    [nombre, apellido, mail, contrasena, dni, matricula || null, oauthProvider, oauthId]
  );
  return result.rows[0];
}

async function buscarPorOauth(provider, oauthId) {
  const result = await pool.query(
    'SELECT * FROM medicos WHERE oauth_provider = $1 AND oauth_id = $2',
    [provider, oauthId]
  );
  return result.rows[0] || null;
}

async function vincularOauth(id, provider, oauthId) {
  const result = await pool.query(
    `UPDATE medicos SET oauth_provider = $1, oauth_id = $2, mail_verificado = TRUE, updated_at = NOW()
     WHERE id = $3
     RETURNING id, nombre, apellido, mail, dni, matricula, verificado, mail_verificado`,
    [provider, oauthId, id]
  );
  return result.rows[0] || null;
}

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT id, nombre, apellido, mail, dni, matricula, verificado, mail_verificado FROM medicos WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorMail(mail) {
  const result = await pool.query('SELECT * FROM medicos WHERE mail = $1', [mail]);
  return result.rows[0] || null;
}

async function listarVerificados() {
  const result = await pool.query(
    `SELECT id, nombre, apellido, mail, matricula, verificado FROM medicos
     WHERE verificado = TRUE ORDER BY apellido, nombre`
  );
  return result.rows;
}

async function listarPendientes() {
  const result = await pool.query(
    `SELECT id, nombre, apellido, mail, dni, matricula, verificado,
       to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS created_at
     FROM medicos WHERE verificado = FALSE ORDER BY created_at`
  );
  return result.rows;
}

async function aprobar(id) {
  const result = await pool.query(
    `UPDATE medicos SET verificado = TRUE, updated_at = NOW() WHERE id = $1
     RETURNING id, nombre, apellido, mail, matricula, verificado`,
    [id]
  );
  return result.rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query('DELETE FROM medicos WHERE id = $1', [id]);
  return result.rowCount > 0;
}

export default {
  crearOauth,
  buscarPorId,
  buscarPorMail,
  buscarPorOauth,
  vincularOauth,
  listarVerificados,
  listarPendientes,
  aprobar,
  eliminar,
};
