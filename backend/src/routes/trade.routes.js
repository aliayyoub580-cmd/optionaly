const express = require('express');
const router = express.Router();
const { getTrades, createTrade } = require('../controllers/tradeController');
const { settleTrade } = require('../controllers/tradeSettleController');
router.get('/', getTrades);
router.post('/', createTrade);
router.post('/settle', settleTrade);
module.exports = router;
