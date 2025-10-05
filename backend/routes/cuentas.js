const express = require('express');
const router = express.Router();

const cuentaController = require('../controllers/cuentaController');
const auth = require('../utils/auth');


router.get('/', auth, cuentaController.getAll);
router.post('/', auth, cuentaController.create);
router.put('/:id', auth, cuentaController.update);
router.delete('/:id', auth, cuentaController.deleteById);

module.exports = router;
