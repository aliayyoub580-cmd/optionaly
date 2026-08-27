const express = require('express');
const router = express.Router();
const { postAuth } = require('../controllers/authController');
router.post('/', postAuth);
module.exports = router;
