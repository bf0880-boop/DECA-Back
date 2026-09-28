import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/perfil', verificarToken, permitirRoles('admin'), adminController.perfil);
router.put('/perfil', verificarToken, permitirRoles('admin'), adminController.actualizarPerfil);

export default router;
