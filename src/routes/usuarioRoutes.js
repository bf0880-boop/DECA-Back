import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/perfil', verificarToken, usuarioController.perfil);
router.get('/', verificarToken, permitirRoles('medico', 'admin'), usuarioController.listar);
router.put('/:id/medico', verificarToken, permitirRoles('admin'), usuarioController.asignarMedico);

export default router;
