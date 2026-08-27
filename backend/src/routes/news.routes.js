const express = require('express');
const router = express.Router();
const { getPublicNews } = require('../controllers/newsController');
router.get('/', getPublicNews);
module.exports = router;
