const express = require('express');
const router = express.Router();
const googleAuthController = require('../controllers/auth/googleAuth.controller');

// Endpoint para login/registro con Google
// En index.js se monta en app.use('/api/usuarios/google', googleAuthRouter)
// por lo que aquí la ruta base debe ser '/'
router.post('/', googleAuthController.loginGoogle);

module.exports = router;

