const { fail } = require('../utils/response');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 'No tenes permisos para realizar esta accion', 403);
    }
    return next();
  };
}

module.exports = requireRole;
