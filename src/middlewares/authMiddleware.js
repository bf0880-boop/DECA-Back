import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import usuarioModel from '../models/usuarioModel.js';
import medicoModel from '../models/medicoModel.js';
import adminModel from '../models/adminModel.js';

const modeloPorRol = {
  paciente: usuarioModel,
  medico: medicoModel,
  admin: adminModel,
};

async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token no provisto.' });
  }

  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado.' });
    }

    const { user } = session;
    const modelo = modeloPorRol[user.role];
    const perfil = modelo && (await modelo.buscarPorAuthUserId(user.id));
    if (!perfil) {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado.' });
    }

    req.usuario = { id: perfil.id, mail: user.email, rol: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado.' });
  }
}

function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ ok: false, error: 'No tenés permiso para acceder a este recurso.' });
    }
    next();
  };
}

export { verificarToken, permitirRoles };
