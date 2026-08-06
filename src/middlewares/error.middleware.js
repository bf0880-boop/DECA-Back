const { fail } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  console.error(err);

  if (err.code === '23505') {
    return fail(res, 'El registro ya existe (dato duplicado)', 409);
  }

  if (err.code === '23503') {
    return fail(res, 'Referencia invalida', 409);
  }

  const status = err.status || 500;
  return fail(res, err.message || 'Error interno del servidor', status);
}

module.exports = errorMiddleware;
