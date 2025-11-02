const express = require('express');
const router = express.Router();
const auth = require('../utils/auth');
const ctrl = require('../controllers/presupuestoController');

router.use(auth);
router.get('/', ctrl.listar);
router.post('/', ctrl.guardar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
