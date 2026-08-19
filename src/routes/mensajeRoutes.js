import { Router } from 'express';
import mensajeController from '../controllers/mensajeController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(verificarToken, permitirRoles('paciente', 'medico'));

router.post('/', mensajeController.enviar);
router.get('/:contraparteId', mensajeController.obtenerConversacion);
router.put('/:id', mensajeController.editar);
router.delete('/:id', mensajeController.eliminar);

export default router;
