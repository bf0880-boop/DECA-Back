const pool = require('../config/db');

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT id, nombre, apellido, mail, verificado FROM medicos WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { buscarPorId };
