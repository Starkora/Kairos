const express = require('express');
const router = express.Router();
const deudaController = require('../controllers/deudaController');
const auth = require('../utils/auth');

router.use(auth); // Proteger todas las rutas de deudas

router.post('/', deudaController.crearDeuda);
router.get('/', deudaController.obtenerDeudas); // Cambia a obtener deudas del usuario autenticado
router.put('/pagar/:id', deudaController.marcarPagada);
router.delete('/:id', deudaController.eliminarDeuda);
router.put('/:id', deudaController.editarDeuda);

// Pagos de deuda
router.post('/pago', deudaController.registrarPago); // body: { deuda_id, monto, fecha }
router.get('/pagos/:deuda_id', deudaController.obtenerPagos);

module.exports = router;
