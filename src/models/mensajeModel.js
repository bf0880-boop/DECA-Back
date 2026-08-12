const pool = require('../config/db');

const SELECT_FORMATEADO = `id, paciente_id, medico_id, emisor, contenido,
   to_char(fecha_hora_entrega AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS fecha_hora_entrega`;

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

module.exports = { crear, obtenerConversacion };
