import pool from '../config/db.js';

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT id, nombre, apellido, mail, verificado FROM admins WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorMail(mail) {
  const result = await pool.query('SELECT * FROM admins WHERE mail = $1', [mail]);
  return result.rows[0] || null;
}

export default { buscarPorId, buscarPorMail };
