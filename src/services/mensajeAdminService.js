import pool from '../config/db.js';

function enHorarioArgentino(columna, alias = columna) {
  return `to_char(${columna} AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS ${alias}`;
}

const SELECT_FORMATEADO = `id, admin_id, usuario_tipo, usuario_id, emisor,
   CASE WHEN eliminado_en IS NULL THEN contenido END AS contenido,
   (eliminado_en IS NOT NULL) AS eliminado,
   ${enHorarioArgentino('fecha_hora_entrega')},
   ${enHorarioArgentino('editado_en')},
   ${enHorarioArgentino('eliminado_en')}`;

async function crear({ adminId, usuarioTipo, usuarioId, emisor, contenido }) {
  const result = await pool.query(
    `INSERT INTO mensajes_admin (admin_id, usuario_tipo, usuario_id, emisor, contenido)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SELECT_FORMATEADO}`,
    [adminId, usuarioTipo, usuarioId, emisor, contenido]
  );
  return result.rows[0];
}

async function obtenerConversacion(adminId, usuarioTipo, usuarioId) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO}
     FROM mensajes_admin
     WHERE admin_id = $1 AND usuario_tipo = $2 AND usuario_id = $3
     ORDER BY fecha_hora_entrega ASC`,
    [adminId, usuarioTipo, usuarioId]
  );
  return result.rows;
}

async function existeConversacion(adminId, usuarioTipo, usuarioId) {
  const result = await pool.query(
    `SELECT 1 FROM mensajes_admin
     WHERE admin_id = $1 AND usuario_tipo = $2 AND usuario_id = $3
     LIMIT 1`,
    [adminId, usuarioTipo, usuarioId]
  );
  return result.rowCount > 0;
}

/** Pacientes y médicos con los que el admin ya tiene una conversación, la más reciente primero. */
async function listarConversacionesDeAdmin(adminId) {
  const result = await pool.query(
    `SELECT c.usuario_tipo, c.usuario_id,
       COALESCE(p.nombre, m.nombre) AS nombre,
       COALESCE(p.apellido, m.apellido) AS apellido,
       ${enHorarioArgentino('c.ultimo', 'ultimo_mensaje_en')}
     FROM (
       SELECT usuario_tipo, usuario_id, MAX(fecha_hora_entrega) AS ultimo
       FROM mensajes_admin
       WHERE admin_id = $1
       GROUP BY usuario_tipo, usuario_id
     ) c
     LEFT JOIN pacientes p ON c.usuario_tipo = 'paciente' AND p.id = c.usuario_id
     LEFT JOIN medicos m ON c.usuario_tipo = 'medico' AND m.id = c.usuario_id
     WHERE p.id IS NOT NULL OR m.id IS NOT NULL
     ORDER BY c.ultimo DESC`,
    [adminId]
  );
  return result.rows;
}

/** Admins que le escribieron a un paciente o médico, el más reciente primero. */
async function listarConversacionesDeUsuario(usuarioTipo, usuarioId) {
  const result = await pool.query(
    `SELECT a.id AS admin_id, a.nombre, a.apellido,
       ${enHorarioArgentino('c.ultimo', 'ultimo_mensaje_en')}
     FROM (
       SELECT admin_id, MAX(fecha_hora_entrega) AS ultimo
       FROM mensajes_admin
       WHERE usuario_tipo = $1 AND usuario_id = $2
       GROUP BY admin_id
     ) c
     JOIN admins a ON a.id = c.admin_id
     ORDER BY c.ultimo DESC`,
    [usuarioTipo, usuarioId]
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    `SELECT ${SELECT_FORMATEADO} FROM mensajes_admin WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function editar(id, contenido) {
  const result = await pool.query(
    `UPDATE mensajes_admin
     SET contenido = $2, editado_en = NOW()
     WHERE id = $1 AND eliminado_en IS NULL
     RETURNING ${SELECT_FORMATEADO}`,
    [id, contenido]
  );
  return result.rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query(
    `UPDATE mensajes_admin
     SET eliminado_en = NOW()
     WHERE id = $1 AND eliminado_en IS NULL
     RETURNING ${SELECT_FORMATEADO}`,
    [id]
  );
  return result.rows[0] || null;
}

export default {
  crear,
  obtenerConversacion,
  existeConversacion,
  listarConversacionesDeAdmin,
  listarConversacionesDeUsuario,
  buscarPorId,
  editar,
  eliminar,
};
