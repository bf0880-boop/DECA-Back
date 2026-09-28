import { Router } from 'express';
import medicoController from '../controllers/medicoController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/perfil', verificarToken, permitirRoles('medico'), medicoController.perfil);
router.put('/perfil', verificarToken, permitirRoles('medico'), medicoController.actualizarPerfil);
router.get('/pendientes', verificarToken, permitirRoles('admin'), medicoController.pendientes);
router.get('/', verificarToken, medicoController.listar);
router.put('/:id/aprobar', verificarToken, permitirRoles('admin'), medicoController.aprobar);
router.delete('/:id', verificarToken, permitirRoles('admin'), medicoController.eliminar);

export default router;
