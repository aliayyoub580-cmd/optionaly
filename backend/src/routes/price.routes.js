const express = require('express');
const router = express.Router();
const { getPrices, getCandles, getPriceStatus } = require('../controllers/priceController');

router.get('/', getPrices);
router.get('/candles', getCandles);
router.get('/status', getPriceStatus);

module.exports = router;
