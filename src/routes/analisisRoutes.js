import { Router } from 'express';
import multer from 'multer';
import analisisController from '../controllers/analisisController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

router.use(verificarToken);

router.post('/', permitirRoles('medico'), subida.single('archivo'), analisisController.realizar);
router.get('/', permitirRoles('paciente', 'medico'), analisisController.listarPropios);
router.get('/:pacienteId', permitirRoles('medico'), analisisController.listarDePaciente);
router.put('/:id/aprobar', permitirRoles('medico'), analisisController.aprobar);
router.delete('/:id', permitirRoles('medico'), analisisController.rechazar);
router.put('/:id/enviar', permitirRoles('medico'), analisisController.enviar);

export default router;
