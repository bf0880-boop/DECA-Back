const { Router } = require('express');
const mensajeController = require('../controllers/mensajeController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

const router = Router();

router.use(verificarToken, permitirRoles('paciente', 'medico'));

router.post('/', mensajeController.enviar);
router.get('/:contraparteId', mensajeController.obtenerConversacion);
router.put('/:id', mensajeController.editar);
router.delete('/:id', mensajeController.eliminar);

module.exports = router;
