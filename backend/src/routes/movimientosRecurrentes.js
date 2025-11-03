const express = require('express');
const router = express.Router();
const movimientoRecurrenteController = require('../controllers/finanzas/movimientoRecurrenteController');
const auth = require('../utils/auth/jwt');


router.post('/', auth, movimientoRecurrenteController.crear);
router.get('/', auth, movimientoRecurrenteController.listar);
router.get('/instancias', auth, movimientoRecurrenteController.instanciasCalendario);
router.put('/:id', auth, movimientoRecurrenteController.editar);
router.delete('/:id', auth, movimientoRecurrenteController.eliminar);
// Excepciones
router.post('/:id/aplicar', auth, movimientoRecurrenteController.aplicarAhora);
router.post('/:id/saltar', auth, movimientoRecurrenteController.saltarHoy);
router.post('/:id/posponer', auth, movimientoRecurrenteController.posponer);

module.exports = router;

