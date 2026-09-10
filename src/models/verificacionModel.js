import crypto from 'node:crypto';
import pool from '../config/db.js';

const TABLA_POR_ROL = {
  paciente: 'pacientes',
  medico: 'medicos',
  admin: 'admins',
};

function generarCodigo() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

async function crearCodigo(usuarioTipo, usuarioId, ttlMinutos) {
  const codigo = generarCodigo();

  await pool.query(
    'DELETE FROM codigos_verificacion WHERE usuario_tipo = $1 AND usuario_id = $2',
    [usuarioTipo, usuarioId]
  );
  await pool.query(
    `INSERT INTO codigos_verificacion (usuario_tipo, usuario_id, codigo, expira_en)
     VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
    [usuarioTipo, usuarioId, codigo, ttlMinutos]
  );

  return codigo;
}

async function consumirCodigo(usuarioTipo, usuarioId, codigo) {
  const result = await pool.query(
    `DELETE FROM codigos_verificacion
     WHERE usuario_tipo = $1 AND usuario_id = $2 AND codigo = $3 AND expira_en > NOW()`,
    [usuarioTipo, usuarioId, codigo]
  );

  return result.rowCount > 0;
}

async function marcarMailVerificado(usuarioTipo, usuarioId) {
  const tabla = TABLA_POR_ROL[usuarioTipo];
  if (!tabla) {
    throw new Error('Tipo de usuario inválido.');
  }

  await pool.query(
    `UPDATE ${tabla} SET mail_verificado = TRUE, updated_at = NOW() WHERE id = $1`,
    [usuarioId]
  );
}

export default { generarCodigo, crearCodigo, consumirCodigo, marcarMailVerificado };
