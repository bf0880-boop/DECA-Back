import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/registro', usuarioController.registro);
router.post('/login', usuarioController.login);
router.get('/perfil', verificarToken, usuarioController.perfil);

export default router;
