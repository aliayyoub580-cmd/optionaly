const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const tradeRoutes = require('./trade.routes');
const assetRoutes = require('./asset.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const newsRoutes = require('./news.routes');
const transactionRoutes = require('./transaction.routes');
const paymentSettingsRoutes = require('./paymentSettings.routes');
const paymentRoutes = require('./payment.routes');
const copyTradingRoutes = require('./copyTrading.routes');
const chatRoutes = require('./chat.routes');
const referralBonusRoutes = require('./referralBonus.routes');
const teamRoutes = require('./team.routes');
const adminRoutes = require('./admin.routes');
const priceRoutes = require('./price.routes');

router.use('/user-entry', authRoutes);
router.use('/user', userRoutes);
router.use('/trades', tradeRoutes);
router.use('/assets', assetRoutes);
router.use('/prices', priceRoutes);
router.use('/price', priceRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/news', newsRoutes);
router.use('/transactions', transactionRoutes);
router.use('/payment-settings', paymentSettingsRoutes);
router.use('/payment', paymentRoutes);
router.use('/copy-trading', copyTradingRoutes);
router.use('/chat/messages', chatRoutes.messages);
router.use('/chat/rooms', chatRoutes.rooms);
router.use('/referral-bonus', referralBonusRoutes);
router.use('/team', teamRoutes);
router.use('/admin', adminRoutes);

// ─── BUILD VERSION ───
// Confirm which build is actually deployed: GET /api/version
router.get('/version', (req, res) => {
  return res.json({
    version: "v7",
    build: "production",
    buildDate: "2026-08-15",
    engine: "authoritative-persistent-market-engine",
    node: process.version,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

module.exports = router;
