const express = require('express');
const router = express.Router();
const auth = require('../utils/auth/jwt');
const ctrl = require('../controllers/finanzas/presupuesto.controller');

router.use(auth);
router.get('/', ctrl.listar);
router.post('/', ctrl.guardar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;

