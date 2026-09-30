import pool from '../config/db.js';

function enHorarioArgentino(columna) {
  return `to_char(${columna} AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS ${columna}`;
}

const SELECT_FORMATEADO =
  `id, paciente_id, porcentaje, banda, score, modelo_sha, archivo_nombre, enviado,
   ${enHorarioArgentino('fecha_hora_entrega')}`;

async function crear({ pacienteId, porcentaje, banda, score, modeloSha, archivoNombre, archivoPathname }) {
  const result = await pool.query(
    `INSERT INTO analisis (paciente_id, porcentaje, banda, score, modelo_sha, archivo_nombre, archivo_pathname, enviado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
     RETURNING ${SELECT_FORMATEADO}`,
    [pacienteId, porcentaje, banda, score, modeloSha, archivoNombre, archivoPathname]
  );
  return result.rows[0];
}

async function listarPorPaciente(pacienteId, { soloEnviados = false } = {}) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO}
     FROM analisis
     WHERE paciente_id = $1${soloEnviados ? ' AND enviado' : ''}
     ORDER BY fecha_hora_entrega DESC`,
    [pacienteId]
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(`SELECT ${SELECT_FORMATEADO} FROM analisis WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function marcarEnviado(id) {
  const result = await pool.query(
    `UPDATE analisis SET enviado = TRUE
     WHERE id = $1 AND NOT enviado
     RETURNING ${SELECT_FORMATEADO}`,
    [id]
  );
  return result.rows[0] || null;
}

async function listarPorMedico(medicoId) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO}
     FROM analisis
     WHERE paciente_id IN (SELECT id FROM pacientes WHERE medico_id = $1)
     ORDER BY fecha_hora_entrega DESC`,
    [medicoId]
  );
  return result.rows;
}

export default { crear, listarPorPaciente, listarPorMedico, buscarPorId, marcarEnviado };
