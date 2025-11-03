const express = require('express');
const router = express.Router();

const cuentaController = require('../controllers/finanzas/cuenta.controller');
const auth = require('../utils/auth/jwt');


router.get('/', auth, cuentaController.getAll);
router.post('/', auth, cuentaController.create);
router.put('/:id', auth, cuentaController.update);
router.delete('/:id', auth, cuentaController.deleteById);

module.exports = router;

