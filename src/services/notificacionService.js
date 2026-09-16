import pool from '../config/db.js';

const SELECT_FORMATEADO = `id, usuario_tipo, usuario_id, contenido, leida,
   to_char(fecha_hora_entrega AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS fecha_hora_entrega`;

async function crear({ usuarioTipo, usuarioId, contenido }) {
  const result = await pool.query(
    `INSERT INTO notificaciones (usuario_tipo, usuario_id, contenido)
     VALUES ($1, $2, $3)
     RETURNING ${SELECT_FORMATEADO}`,
    [usuarioTipo, usuarioId, contenido]
  );
  return result.rows[0];
}

async function listarPorUsuario(usuarioTipo, usuarioId) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO}
     FROM notificaciones
     WHERE usuario_tipo = $1 AND usuario_id = $2
     ORDER BY fecha_hora_entrega DESC`,
    [usuarioTipo, usuarioId]
  );
  return result.rows;
}

async function marcarLeida(id, usuarioTipo, usuarioId) {
  const result = await pool.query(
    `UPDATE notificaciones
     SET leida = TRUE
     WHERE id = $1 AND usuario_tipo = $2 AND usuario_id = $3
     RETURNING ${SELECT_FORMATEADO}`,
    [id, usuarioTipo, usuarioId]
  );
  return result.rows[0] || null;
}

export default { crear, listarPorUsuario, marcarLeida };
