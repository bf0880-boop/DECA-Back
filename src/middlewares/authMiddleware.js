const jwt = require('jsonwebtoken');
const env = require('../config/env');

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token no provisto.' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    req.usuario = jwt.verify(token, env.jwt.secret);
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

module.exports = { verificarToken, permitirRoles };
