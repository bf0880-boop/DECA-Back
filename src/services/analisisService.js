import pool from '../config/db.js';

function enHorarioArgentino(columna) {
  return `to_char(${columna} AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS ${columna}`;
}

const SELECT_FORMATEADO =
  `id, paciente_id, porcentaje, banda, score, modelo_sha, archivo_nombre,
   ${enHorarioArgentino('fecha_hora_entrega')}`;

async function crear({ pacienteId, porcentaje, banda, score, modeloSha, archivoNombre, archivoPathname }) {
  const result = await pool.query(
    `INSERT INTO analisis (paciente_id, porcentaje, banda, score, modelo_sha, archivo_nombre, archivo_pathname)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SELECT_FORMATEADO}`,
    [pacienteId, porcentaje, banda, score, modeloSha, archivoNombre, archivoPathname]
  );
  return result.rows[0];
}

async function listarPorPaciente(pacienteId) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO}
     FROM analisis
     WHERE paciente_id = $1
     ORDER BY fecha_hora_entrega DESC`,
    [pacienteId]
  );
  return result.rows;
}

export default { crear, listarPorPaciente };
