const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const auth = require('../utils/auth');

router.use(auth); // Proteger todas las rutas de metas

router.post('/', metaController.crearMeta);
router.get('/', metaController.obtenerMetas); // Cambia a obtener metas del usuario autenticado
router.put('/monto/:id', metaController.actualizarMontoAhorrado);
router.put('/cumplida/:id', metaController.marcarCumplida);
router.delete('/:id', metaController.eliminarMeta);
router.put('/:id', metaController.editarMeta); // Nueva ruta para editar metas

// Aportes a metas
router.post('/aporte', metaController.registrarAporte); // body: { meta_id, monto, fecha }
router.get('/aportes/:meta_id', metaController.obtenerAportes);

module.exports = router;
