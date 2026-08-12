const { Router } = require('express');
const notificacionController = require('../controllers/notificacionController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

const router = Router();

router.use(verificarToken, permitirRoles('paciente', 'medico'));

router.get('/', notificacionController.listar);
router.put('/:id/leida', notificacionController.marcarLeida);

module.exports = router;
