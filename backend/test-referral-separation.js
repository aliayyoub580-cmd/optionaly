const { query, transaction } = require('./src/helpers/db');
const { createReferralDepositBonuses } = require('./src/helpers/referral-bonus');
const { generateTradeBonus } = require('./src/controllers/tradeSettleController');
const { v4: uuidv4 } = require('uuid');

async function runTest() {
  console.log('=== Starting Referral & Trade Commission Separation Verification Test ===\n');

  try {
    const leaderEmail = `test-leader-${Date.now()}@example.com`;
    const downlineEmail = `test-downline-${Date.now()}@example.com`;
    const leaderId = uuidv4();
    const downlineId = uuidv4();
    const refCode = `REF${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Create test leader and downline
    await query(
      `INSERT INTO users (id, email, password, name, referralCode, balance, demoBalance, realBalance, createdAt, updatedAt)
       VALUES (?, ?, 'pass123', 'Test Leader', ?, 1000, 1000, 1000, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [leaderId, leaderEmail, refCode]
    );

    await query(
      `INSERT INTO users (id, email, password, name, referredBy, accountType, balance, demoBalance, realBalance, createdAt, updatedAt)
       VALUES (?, ?, 'pass123', 'Test Downline', ?, 'real', 500, 500, 500, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [downlineId, downlineEmail, leaderId]
    );

    await query(
      `INSERT INTO referrals (id, referrerId, referredId, level, commissionEarned, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 1, 0, 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [uuidv4(), leaderId, downlineId]
    );

    console.log(`✓ Test Users Created: Leader (${leaderEmail}) & Downline (${downlineEmail})`);

    // 2. Test Downline Deposit Simulation ($200 deposit)
    console.log('\n--- Test 1: Simulating Downline Deposit ($200) ---');
    const depositTxId = `dep-${Date.now()}`;
    await createReferralDepositBonuses(downlineId, 'Test Downline', 200, depositTxId);

    const depBonuses = await query('SELECT * FROM referral_deposit_bonuses WHERE referrerId = ?', [leaderId]);
    const tradeBonusesBefore = await query('SELECT * FROM trade_bonuses WHERE leaderId = ?', [leaderId]);

    console.log(`Referral Deposit Bonuses count for leader: ${depBonuses.length}`);
    console.log(`Trade Commissions count for leader: ${tradeBonusesBefore.length}`);

    if (depBonuses.length !== 1) throw new Error('Expected 1 deposit bonus record!');
    if (depBonuses[0].bonusAmount <= 0) throw new Error('Expected positive deposit bonus amount!');
    if (tradeBonusesBefore.length !== 0) throw new Error('Trade bonuses must NOT update on deposit!');
    console.log(`✓ Deposit Bonus correctly created: $${depBonuses[0].bonusAmount} (${depBonuses[0].bonusPercentage}%). Trade Commission remained 0.`);

    // 3. Test Downline Trade Simulation (WIN Trade & LOSS Trade)
    console.log('\n--- Test 2: Simulating Downline Trades (WIN & LOSS) ---');

    // Win Trade
    await generateTradeBonus(downlineId, 100, 'EUR/USD', 'up', 'won', `trade-win-${Date.now()}`);
    // Loss Trade
    await generateTradeBonus(downlineId, 50, 'BTC/USD', 'down', 'lost', `trade-loss-${Date.now()}`);

    const depBonusesAfter = await query('SELECT * FROM referral_deposit_bonuses WHERE referrerId = ?', [leaderId]);
    const tradeBonusesAfter = await query('SELECT * FROM trade_bonuses WHERE leaderId = ?', [leaderId]);

    console.log(`Referral Deposit Bonuses count for leader after trades: ${depBonusesAfter.length}`);
    console.log(`Trade Commissions count for leader after trades: ${tradeBonusesAfter.length}`);

    if (depBonusesAfter.length !== 1) throw new Error('Deposit bonuses count must NOT change on trades!');
    if (tradeBonusesAfter.length !== 2) throw new Error('Expected 2 trade commission records (for WIN and LOSS trades)!');

    console.log('✓ Trade Commissions generated for BOTH Won & Lost trades:');
    tradeBonusesAfter.forEach(tb => {
      console.log(`  - Trade ${tb.assetSymbol} ($${tb.tradeAmount}): Commission = $${tb.bonusAmount} (${tb.tradeStatus})`);
    });

    // 4. Verify API Controller Data Separation
    console.log('\n--- Test 3: API Controller Isolation ---');
    const { getTeamData } = require('./src/controllers/teamController');

    let apiResponse;
    const req = { query: { userId: leaderId }, headers: {} };
    const res = {
      status: (code) => ({ json: (d) => { apiResponse = d; } }),
      json: (d) => { apiResponse = d; }
    };

    await getTeamData(req, res);

    console.log('API getTeamData stats response:');
    console.log(JSON.stringify(apiResponse.stats, null, 2));

    if (apiResponse.stats.depositBonusClaimed === undefined) throw new Error('Missing depositBonusClaimed in stats!');
    if (apiResponse.stats.tradeCommissionClaimed === undefined) throw new Error('Missing tradeCommissionClaimed in stats!');

    console.log('\n=== ALL SEPARATION VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTest();
