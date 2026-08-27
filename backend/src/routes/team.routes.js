const express = require('express');
const router = express.Router();
const {
  getTeamData,
  seedTeam,
  getTeamBonuses,
  createTeamBonus,
  seedTeamBonus,
  claimAllTeamBonuses,
  claimTeamBonus,
  getTeamTradeBonuses,
  seedTeamTradeBonus,
  claimAllTeamTradeBonuses,
  claimTeamTradeBonus,
} = require('../controllers/teamController');

// GET /api/team/data?userId=xxx
router.get('/data', getTeamData);

// POST /api/team/seed
router.post('/seed', seedTeam);

// ─── Bonus sub-routes ───
// GET /api/team/bonus?userId=xxx
router.get('/bonus', getTeamBonuses);

// POST /api/team/bonus
router.post('/bonus', createTeamBonus);

// POST /api/team/bonus/seed
router.post('/bonus/seed', seedTeamBonus);

// POST /api/team/bonus/claim-all
router.post('/bonus/claim-all', claimAllTeamBonuses);

// POST /api/team/bonus/:id/claim
router.post('/bonus/:id/claim', claimTeamBonus);

// ─── Trade Bonus sub-routes ───
// GET /api/team/trade-bonus?userId=xxx
router.get('/trade-bonus', getTeamTradeBonuses);

// POST /api/team/trade-bonus/seed
router.post('/trade-bonus/seed', seedTeamTradeBonus);

// POST /api/team/trade-bonus/claim-all
router.post('/trade-bonus/claim-all', claimAllTeamTradeBonuses);

// POST /api/team/trade-bonus/:id/claim
router.post('/trade-bonus/:id/claim', claimTeamTradeBonus);

module.exports = router;
