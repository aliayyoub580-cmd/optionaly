const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const { postAdminLogin } = require('../controllers/authController');
const {
  getAdminNews,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews,
  newsUpload,
  getAdminUsers,
  getAdminTrades,
  getAdminCopyTradesUsers,
  getAdminPaymentSettings,
  createAdminPaymentSetting,
  updateAdminPaymentSetting,
  deleteAdminPaymentSetting,
  getAdminBonusSettings,
  updateAdminBonusSettings,
  getAdminTeam,
  updateAdminTeam,
  createAdminTeamEntry,
  getAdminBot,
  toggleAdminBot,
  getAdminTransactions,
  createAdminTransaction,
  updateAdminTransaction,
  getAdminTradeBonus,
  updateAdminTradeBonus,
  getAdminCopyTrading,
  createAdminCopyTrader,
  updateAdminCopyTrader,
  deleteAdminCopyTrader,
  updatePriceSettings,
  updatePayout,
  setManualPrice,
  getAdminKycSubmissions,
  reviewAdminKyc,
} = require('../controllers/adminController');

// Public Admin Login Endpoint
router.post('/login', postAdminLogin);

// Protected Admin Routes (Requires valid JWT & Admin role)
router.use(adminAuth);

// ─── Admin News ───
router.get('/news', getAdminNews);
router.post('/news', newsUpload.single('image'), createAdminNews);
router.put('/news', newsUpload.single('image'), updateAdminNews);
router.delete('/news', deleteAdminNews);

// ─── Admin Users ───
router.get('/users', getAdminUsers);

// ─── Admin Trades ───
router.get('/trades', getAdminTrades);

// ─── Admin Copy Trades Users ───
router.get('/copy-trades-users', getAdminCopyTradesUsers);

// ─── Admin Payment Settings ───
router.get('/payment-settings', getAdminPaymentSettings);
router.post('/payment-settings', createAdminPaymentSetting);
router.patch('/payment-settings', updateAdminPaymentSetting);
router.delete('/payment-settings', deleteAdminPaymentSetting);

// ─── Admin Bonus Settings ───
router.get('/bonus-settings', getAdminBonusSettings);
router.put('/bonus-settings', updateAdminBonusSettings);

// ─── Admin Team ───
router.get('/team', getAdminTeam);
router.patch('/team', updateAdminTeam);
router.post('/team', createAdminTeamEntry);

// ─── Admin Bot ───
router.get('/bot', getAdminBot);
router.post('/bot/toggle', toggleAdminBot);

// ─── Admin Transactions ───
router.get('/transactions', getAdminTransactions);
router.post('/transactions', createAdminTransaction);
router.patch('/transactions', updateAdminTransaction);

// ─── Admin Trade Bonus ───
router.get('/trade-bonus', getAdminTradeBonus);
router.patch('/trade-bonus', updateAdminTradeBonus);

// ─── Admin Copy Trading ───
router.get('/copy-trading', getAdminCopyTrading);
router.post('/copy-trading', createAdminCopyTrader);
router.patch('/copy-trading', updateAdminCopyTrader);
router.delete('/copy-trading', deleteAdminCopyTrader);

// ─── Admin Price Controls ───
router.post('/price-settings', updatePriceSettings);
router.post('/update-payout', updatePayout);
router.post('/set-price', setManualPrice);

// ─── Admin KYC Controls ───
router.get('/kyc', getAdminKycSubmissions);
router.patch('/kyc', reviewAdminKyc);

module.exports = router;
