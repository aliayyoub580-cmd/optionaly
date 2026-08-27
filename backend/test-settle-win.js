const { query } = require('./src/helpers/db');
const { settleTradeById } = require('./src/controllers/tradeSettleController');
const { v4: uuidv4 } = require('uuid');

async function runTest() {
  console.log('=== Starting Trade Settlement Payout & Win/Loss Popup Verification Test ===\n');

  try {
    const userId = uuidv4();
    const userEmail = `trader-win-${Date.now()}@example.com`;

    // 1. Create test user with $1000 balance
    await query(
      `INSERT INTO users (id, email, password, name, accountType, balance, demoBalance, realBalance, createdAt, updatedAt)
       VALUES (?, ?, 'pass123', 'Win Tester', 'demo', 1000, 1000, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [userId, userEmail]
    );

    console.log(`✓ Created test user ${userEmail} with initial balance $1000.00`);

    // 2. Place a trade of $100 (stake deducted -> balance = $900)
    await query(
      `UPDATE users SET balance = balance - 100, demoBalance = demoBalance - 100 WHERE id = ?`,
      [userId]
    );

    const assetRows = await query('SELECT id FROM assets LIMIT 1');
    const assetId = assetRows[0].id;
    const tradeId = uuidv4();
    const nowDb = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await query(
      `INSERT INTO trades (id, userId, assetId, direction, amount, payout, entryPrice, expirySeconds, status, userAccountType, openedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, 'up', 100, 87, 1.08500, 15, 'open', 'demo', ?, ?, ?)`,
      [tradeId, userId, assetId, nowDb, nowDb, nowDb]
    );

    const userAfterDeduct = (await query('SELECT balance, demoBalance FROM users WHERE id = ?', [userId]))[0];
    console.log(`✓ Placed $100 UP trade. Balance after deduction: $${userAfterDeduct.balance}`);

    // 3. Settle trade as WON at exit price 1.08600 (higher than entry 1.08500)
    const result1 = await settleTradeById(tradeId, 1.08600, 'demo');

    console.log('\n--- Settlement Result (First Call) ---');
    console.log(`Status: ${result1.status}`);
    console.log(`Exit Price: ${result1.exitPrice}`);
    console.log(`Profit: $${result1.profit}`);
    console.log(`Returned newBalance: $${result1.newBalance}`);
    console.log(`Returned newDemoBalance: $${result1.newDemoBalance}`);

    if (result1.status !== 'won') throw new Error('Trade should be WON!');
    if (result1.profit !== 87) throw new Error(`Profit should be 87, got ${result1.profit}`);
    if (result1.newDemoBalance !== 1087) throw new Error(`Balance should be 1087 ($900 + $100 stake + $87 profit), got ${result1.newDemoBalance}`);

    console.log('✓ Trade successfully settled as WON! Balance instantly updated from $900 -> $1087.00.');

    // 4. Test duplicate settlement call (alreadyClosed: true path)
    console.log('\n--- Duplicate Settlement Call (alreadyClosed: true) ---');
    const result2 = await settleTradeById(tradeId, 1.08600, 'demo');

    console.log(`alreadyClosed: ${result2.alreadyClosed}`);
    console.log(`Returned newBalance: $${result2.newBalance}`);
    console.log(`Returned newDemoBalance: $${result2.newDemoBalance}`);

    if (!result2.alreadyClosed) throw new Error('Second call should return alreadyClosed: true');
    if (result2.newDemoBalance !== 1087) throw new Error(`Second call must return balance 1087, got ${result2.newDemoBalance}`);

    console.log('✓ Duplicate settlement call returns valid balance metadata ($1087.00) without error.');

    console.log('\n=== ALL TRADE PAYOUT & BALANCE VERIFICATION TESTS PASSED! ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
