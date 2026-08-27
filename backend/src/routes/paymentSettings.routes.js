const express = require('express');
const router = express.Router();
const { getPaymentSettings } = require('../controllers/paymentSettingsController');
router.get('/', getPaymentSettings);
module.exports = router;
