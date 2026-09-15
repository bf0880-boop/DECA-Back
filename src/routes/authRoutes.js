import { Router } from 'express';
import authController from '../controllers/authController.js';

const router = Router();

router.post('/completar-registro', authController.completarRegistro);
router.post('/:provider', authController.iniciar);

export default router;
