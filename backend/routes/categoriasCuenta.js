const express = require('express');
const router = express.Router();
const categoriaCuentaController = require('../controllers/categoriaCuentaController');
const auth = require('../utils/auth');

router.get('/', auth, categoriaCuentaController.getAll);
router.post('/', auth, categoriaCuentaController.create);
router.put('/:id', auth, categoriaCuentaController.update);
router.delete('/:id', auth, categoriaCuentaController.delete);

module.exports = router;
