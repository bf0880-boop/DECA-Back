import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/perfil', verificarToken, adminController.perfil);

export default router;
