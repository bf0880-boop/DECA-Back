const { fail } = require('../utils/response');

// rules: { campo: { required, type, minLength } }
function validate(rules) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      const isEmpty = value === undefined || value === null || value === '';

      if (rule.required && isEmpty) {
        errors.push(`${field} es requerido`);
        continue;
      }

      if (isEmpty) continue;

      if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field} debe ser un email valido`);
      }

      if (rule.type === 'date' && Number.isNaN(Date.parse(value))) {
        errors.push(`${field} debe ser una fecha valida`);
      }

      if (rule.type === 'number' && Number.isNaN(Number(value))) {
        errors.push(`${field} debe ser numerico`);
      }

      if (rule.minLength && String(value).length < rule.minLength) {
        errors.push(`${field} debe tener al menos ${rule.minLength} caracteres`);
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} debe ser uno de: ${rule.enum.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return fail(res, 'Error de validacion', 422, errors);
    }

    return next();
  };
}

module.exports = validate;
