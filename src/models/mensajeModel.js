const pool = require('../config/db');

function enHorarioArgentino(columna) {
  return `to_char(${columna} AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS ${columna}`;
}

const SELECT_FORMATEADO = `id, paciente_id, medico_id, emisor,
   CASE WHEN eliminado_en IS NULL THEN contenido END AS contenido,
   (eliminado_en IS NOT NULL) AS eliminado,
   ${enHorarioArgentino('fecha_hora_entrega')},
   ${enHorarioArgentino('editado_en')},
   ${enHorarioArgentino('eliminado_en')}`;

async function crear({ pacienteId, medicoId, emisor, contenido }) {
  const result = await pool.query(
    `INSERT INTO mensajes (paciente_id, medico_id, emisor, contenido)
     VALUES ($1, $2, $3, $4)
     RETURNING ${SELECT_FORMATEADO}`,
    [pacienteId, medicoId, emisor, contenido]
  );
  return result.rows[0];
}

async function obtenerConversacion(pacienteId, medicoId) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO}
     FROM mensajes
     WHERE paciente_id = $1 AND medico_id = $2
     ORDER BY fecha_hora_entrega ASC`,
    [pacienteId, medicoId]
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO} FROM mensajes WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function editar(id, contenido) {
  const result = await pool.query(
    `UPDATE mensajes
     SET contenido = $2, editado_en = NOW()
     WHERE id = $1 AND eliminado_en IS NULL
     RETURNING ${SELECT_FORMATEADO}`,
    [id, contenido]
  );
  return result.rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query(
    `UPDATE mensajes
     SET eliminado_en = NOW()
     WHERE id = $1 AND eliminado_en IS NULL
     RETURNING ${SELECT_FORMATEADO}`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { crear, obtenerConversacion, buscarPorId, editar, eliminar };
