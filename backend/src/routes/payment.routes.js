const express = require('express');
const router = express.Router();
const { handleWebhook, createWPayOrder, handleWPayWebhook, reconcileWPayDeposits, createWithdrawal } = require('../controllers/paymentController');
const { adminAuth } = require('../middleware/adminAuth');

// User Withdrawal API (PKR WPay / EasyPaisa / JazzCash & Crypto NOWPayments)
router.post('/withdraw', createWithdrawal);

// WPay PKR Deposit Order Creation
router.post('/wpay-create', createWPayOrder);

// WPay Callback Webhook (Supports POST and GET)
router.post('/wpay-webhook', handleWPayWebhook);
router.get('/wpay-webhook', handleWPayWebhook);

// Reconciliation endpoint protected with Admin Authentication
router.get('/reconcile-wpay', adminAuth, reconcileWPayDeposits);
router.post('/reconcile-wpay', adminAuth, reconcileWPayDeposits);

// Existing NOWPayments Webhook (Crypto)
router.post('/webhook', handleWebhook);

module.exports = router;
