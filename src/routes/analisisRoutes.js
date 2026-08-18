const { Router } = require('express');
const analisisController = require('../controllers/analisisController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

const router = Router();

router.use(verificarToken);

router.post('/', permitirRoles('medico'), analisisController.realizar);
router.get('/', permitirRoles('paciente'), analisisController.listarPropios);
router.get('/:pacienteId', permitirRoles('medico'), analisisController.listarDePaciente);

module.exports = router;
