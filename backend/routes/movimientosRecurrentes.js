const express = require('express');
const router = express.Router();
const movimientoRecurrenteController = require('../controllers/movimientoRecurrenteController');
const auth = require('../utils/auth');


router.post('/', auth, movimientoRecurrenteController.crear);
router.get('/', auth, movimientoRecurrenteController.listar);
router.get('/instancias', auth, movimientoRecurrenteController.instanciasCalendario);
router.put('/:id', auth, movimientoRecurrenteController.editar);
router.delete('/:id', auth, movimientoRecurrenteController.eliminar);

module.exports = router;
