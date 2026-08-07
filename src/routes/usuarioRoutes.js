const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');

const router = Router();

router.post('/registro', usuarioController.registro);
router.post('/login', usuarioController.login);

module.exports = router;
