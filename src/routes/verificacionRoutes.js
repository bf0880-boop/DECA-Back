import { Router } from 'express';
import verificacionController from '../controllers/verificacionController.js';

const router = Router();

router.post('/enviar', verificacionController.enviar);
router.post('/confirmar', verificacionController.confirmar);

export default router;
