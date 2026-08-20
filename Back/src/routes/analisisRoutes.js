import { Router } from 'express';
import analisisController from '../controllers/analisisController.js';
import { verificarToken, permitirRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(verificarToken);

router.post('/', permitirRoles('medico'), analisisController.realizar);
router.get('/', permitirRoles('paciente'), analisisController.listarPropios);
router.get('/:pacienteId', permitirRoles('medico'), analisisController.listarDePaciente);

export default router;
