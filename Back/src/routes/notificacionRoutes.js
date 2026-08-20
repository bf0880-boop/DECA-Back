import { Router } from 'express';
import notificacionController from '../controllers/notificacionController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(verificarToken, permitirRoles('paciente', 'medico'));

router.get('/', notificacionController.listar);
router.put('/:id/leida', notificacionController.marcarLeida);

export default router;
