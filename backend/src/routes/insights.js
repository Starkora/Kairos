const express = require('express');
const router = express.Router();
const auth = require('../utils/auth/jwt');
const ctrl = require('../controllers/insights.controller');

router.use(auth);
router.get('/', ctrl.list);
router.post('/dismiss', ctrl.dismiss);

module.exports = router;
