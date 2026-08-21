import { Router } from 'express';
import medicoController from '../controllers/medicoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', medicoController.login);
router.get('/perfil', verificarToken, medicoController.perfil);

export default router;
