const express = require('express');
const router = express.Router();

const categoriaController = require('../controllers/configuracion/categoria.controller');
const auth = require('../utils/auth/jwt');


router.get('/', auth, categoriaController.getAll);
router.get('/:tipo', auth, categoriaController.getByTipo);
router.post('/', auth, categoriaController.create);
router.put('/:id', auth, categoriaController.update);
router.delete('/:id', auth, categoriaController.delete);

module.exports = router;

