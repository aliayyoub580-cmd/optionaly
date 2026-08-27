const express = require('express');
const router = express.Router();
const {
  getCopyTraders,
  subscribeCopyTrading,
  claimCopyTradeProfit,
  updateCopyTrade,
  deleteCopyTrade
} = require('../controllers/copyTradingController');

// Support both root routes (/api/copy-trading) and sub-paths (/masters, /subscribe, /claim)
router.get('/', getCopyTraders);
router.get('/masters', getCopyTraders);

router.post('/', subscribeCopyTrading);
router.post('/subscribe', subscribeCopyTrading);
router.post('/claim', claimCopyTradeProfit);

router.put('/', updateCopyTrade);
router.patch('/', updateCopyTrade);

router.delete('/', deleteCopyTrade);
router.delete('/:id', deleteCopyTrade);

module.exports = router;
