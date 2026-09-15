import pool from '../config/db.js';

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT id, nombre, apellido, mail, verificado, mail_verificado FROM admins WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorMail(mail) {
  const result = await pool.query('SELECT * FROM admins WHERE mail = $1', [mail]);
  return result.rows[0] || null;
}

async function buscarPorOauth(provider, oauthId) {
  const result = await pool.query(
    'SELECT * FROM admins WHERE oauth_provider = $1 AND oauth_id = $2',
    [provider, oauthId]
  );
  return result.rows[0] || null;
}

async function vincularOauth(id, provider, oauthId) {
  const result = await pool.query(
    `UPDATE admins SET oauth_provider = $1, oauth_id = $2, mail_verificado = TRUE, updated_at = NOW()
     WHERE id = $3
     RETURNING id, nombre, apellido, mail, verificado, mail_verificado`,
    [provider, oauthId, id]
  );
  return result.rows[0] || null;
}

export default { buscarPorId, buscarPorMail, buscarPorOauth, vincularOauth };
