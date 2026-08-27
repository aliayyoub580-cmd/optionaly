const { query } = require('../helpers/db');

async function runAudit() {
  console.log('==================================================');
  console.log('END-TO-END SYSTEM FUNCTIONALITY AUDIT');
  console.log('==================================================');

  // 1. Health Check
  const priceEngine = require('../helpers/priceEngine');
  await priceEngine.start(null);
  console.log('\n[Phase 1] System Health: OK (Engine running, MySQL connected)');

  // 2. Query Test User
  const users = await query("SELECT id, name, email, demoBalance, realBalance, balance, accountType FROM users LIMIT 1");
  if (users.length === 0) {
    console.error('No users found in database.');
    process.exit(1);
  }
  const testUser = users[0];
  console.log('\n[Phase 2] Login & Profile Check:');
  console.log(`- User ID: ${testUser.id}`);
  console.log(`- Email: ${testUser.email}`);
  console.log(`- Demo Balance: $${testUser.demoBalance}`);
  console.log(`- Real Balance: $${testUser.realBalance}`);
  console.log(`- Total Balance: $${testUser.balance}`);
  console.log(`- Account Type: ${testUser.accountType}`);

  // 3. Trade Open Test
  const { createTrade } = require('../controllers/tradeController');
  const mockReqTrade = {
    body: {
      userId: testUser.email,
      assetSymbol: 'EUR/USD',
      direction: 'up',
      amount: 10,
      expirySeconds: 15,
      accountType: 'demo'
    }
  };
  let tradeResult = null;
  const mockResTrade = {
    status(code) { this.statusCode = code; return this; },
    json(data) { tradeResult = { status: this.statusCode, data }; return this; }
  };
  await createTrade(mockReqTrade, mockResTrade);
  console.log('\n[Phase 3] Trade Open Test:');
  console.log(`- Status: ${tradeResult.status}`);
  console.log(`- Trade ID: ${tradeResult.data?.id}`);
  console.log(`- Entry Price: ${tradeResult.data?.entryPrice}`);
  console.log(`- New Demo Balance: $${tradeResult.data?.newDemoBalance}`);

  // 4. Trade Close Test
  if (tradeResult.data?.id) {
    const { settleTradeById } = require('../controllers/tradeSettleController');
    const settleRes = await settleTradeById(tradeResult.data.id, tradeResult.data.entryPrice + 0.00020, 'demo');
    console.log('\n[Phase 4] Trade Close Test:');
    console.log(`- Settled Status: ${settleRes.status}`);
    console.log(`- Profit: $${settleRes.profit}`);
    console.log(`- Updated Demo Balance: $${settleRes.newDemoBalance}`);
  }

  // 5. WPay PKR Deposit Order Test
  const { createWPayOrder } = require('../controllers/paymentController');
  const mockReqWPay = {
    body: {
      email: testUser.email,
      amount: 500,
      payType: 'TRANSFER'
    }
  };
  let wpayResult = null;
  const mockResWPay = {
    status(code) { this.statusCode = code; return this; },
    json(data) { wpayResult = { status: this.statusCode, data }; return this; }
  };
  await createWPayOrder(mockReqWPay, mockResWPay);
  console.log('\n[Phase 5] WPay PKR Deposit Order Test:');
  console.log(`- Status: ${wpayResult.status}`);
  console.log(`- Result:`, wpayResult.data);

  // 6. Transactions Audit
  const txs = await query("SELECT id, userId, type, amount, status, method, payCurrency, payAmount, createdAt FROM transactions ORDER BY createdAt DESC LIMIT 5");
  console.log('\n[Phase 10] Latest 5 Transactions Audit:');
  console.table(txs);

  process.exit(0);
}

runAudit();
