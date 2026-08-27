const express = require('express');
const router = express.Router();
const { getReferralBonuses, claimBonus, claimAllBonuses, getBonusSettings, updateBonusSettings } = require('../controllers/referralBonusController');

// GET /api/referral-bonus?userId=xxx
router.get('/', getReferralBonuses);

// POST /api/referral-bonus/claim
router.post('/claim', claimBonus);

// POST /api/referral-bonus/claim-all
router.post('/claim-all', claimAllBonuses);

// GET /api/referral-bonus/settings
router.get('/settings', getBonusSettings);

// PUT /api/referral-bonus/settings
router.put('/settings', updateBonusSettings);

module.exports = router;
