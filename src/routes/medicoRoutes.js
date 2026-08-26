import { Router } from 'express';
import medicoController from '../controllers/medicoController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/registro', medicoController.registro);
router.post('/login', medicoController.login);
router.get('/perfil', verificarToken, medicoController.perfil);
router.get('/pendientes', verificarToken, permitirRoles('admin'), medicoController.pendientes);
router.get('/', verificarToken, medicoController.listar);
router.put('/:id/aprobar', verificarToken, permitirRoles('admin'), medicoController.aprobar);
router.delete('/:id', verificarToken, permitirRoles('admin'), medicoController.eliminar);

export default router;
