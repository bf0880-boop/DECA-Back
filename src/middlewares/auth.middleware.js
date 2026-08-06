const { verifyToken } = require('../utils/token');
const { fail } = require('../utils/response');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'No autorizado', 401);
  }

  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return fail(res, 'Token invalido o expirado', 401);
  }
}

module.exports = authMiddleware;
