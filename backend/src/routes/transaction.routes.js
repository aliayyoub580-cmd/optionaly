const express = require('express');
const router = express.Router();
const { getTransactions, createTransaction, getTransactionStatus, cancelTransaction } = require('../controllers/transactionController');

router.get('/', getTransactions);
router.post('/', createTransaction);
router.get('/status', getTransactionStatus);
router.post('/cancel', cancelTransaction);

module.exports = router;
