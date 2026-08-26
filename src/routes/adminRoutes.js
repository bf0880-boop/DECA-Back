import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', adminController.login);
router.get('/perfil', verificarToken, adminController.perfil);

export default router;
