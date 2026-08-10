const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');
const { verificarToken } = require('../middlewares/authMiddleware');

const router = Router();

router.post('/registro', usuarioController.registro);
router.post('/login', usuarioController.login);
router.get('/perfil', verificarToken, usuarioController.perfil);

module.exports = router;
