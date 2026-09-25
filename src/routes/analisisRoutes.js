import { Router } from 'express';
import multer from 'multer';
import analisisController from '../controllers/analisisController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// memoryStorage porque el archivo se reenvía y se descarta: nunca toca el disco.
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.use(verificarToken);

router.post('/', permitirRoles('medico'), subida.single('archivo'), analisisController.realizar);
router.get('/', permitirRoles('paciente'), analisisController.listarPropios);
router.get('/:pacienteId', permitirRoles('medico'), analisisController.listarDePaciente);

export default router;
