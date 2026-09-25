import { Router } from 'express';
import authController from '../controllers/authController.js';

const router = Router();

router.post('/completar-registro', authController.completarRegistro);
// Antes que /:provider, si no "login" se toma como proveedor OAuth.
router.post('/login', authController.login);
router.post('/:provider', authController.iniciar);

export default router;
