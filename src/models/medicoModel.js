import pool from '../config/db.js';

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT id, nombre, apellido, mail, verificado FROM medicos WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorMail(mail) {
  const result = await pool.query('SELECT * FROM medicos WHERE mail = $1', [mail]);
  return result.rows[0] || null;
}

async function listarTodos() {
  const result = await pool.query(
    'SELECT id, nombre, apellido, mail, verificado FROM medicos ORDER BY apellido, nombre'
  );
  return result.rows;
}

export default { buscarPorId, buscarPorMail, listarTodos };
