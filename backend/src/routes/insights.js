const express = require('express');
const router = express.Router();
const auth = require('../utils/auth');
const ctrl = require('../controllers/insightsController');

router.use(auth);
router.get('/', ctrl.list);
router.post('/dismiss', ctrl.dismiss);

module.exports = router;
