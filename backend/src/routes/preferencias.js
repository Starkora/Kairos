const express = require('express');
const router = express.Router();
const auth = require('../utils/auth/jwt');
const preferencias = require('../controllers/preferenciasController');

router.get('/', auth, preferencias.getPreferencias);
router.post('/', auth, preferencias.savePreferencias);

module.exports = router;
