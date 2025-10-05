const express = require('express');
const router = express.Router();

const categoriaController = require('../controllers/categoriaController');
const auth = require('../utils/auth');


router.get('/', auth, categoriaController.getAll);
router.get('/:tipo', auth, categoriaController.getByTipo);
router.post('/', auth, categoriaController.create);
router.put('/:id', auth, categoriaController.update);
router.delete('/:id', auth, categoriaController.delete);

module.exports = router;
