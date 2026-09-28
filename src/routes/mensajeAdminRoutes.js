import { Router } from 'express';
import mensajeAdminController from '../controllers/mensajeAdminController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(verificarToken, permitirRoles('admin', 'paciente', 'medico'));

router.get('/conversaciones', mensajeAdminController.conversaciones);
router.get('/:contraparteTipo/:contraparteId', mensajeAdminController.obtenerConversacion);
router.post('/', mensajeAdminController.enviar);
router.put('/:id', mensajeAdminController.editar);
router.delete('/:id', mensajeAdminController.eliminar);

export default router;
