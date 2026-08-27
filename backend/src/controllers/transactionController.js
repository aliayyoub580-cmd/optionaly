const { query, transaction } = require('../helpers/db');
const { v4: uuidv4 } = require('uuid');
const { createPayment, createInvoice } = require('../helpers/nowpayments');

async function getTransactions(req, res) {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const users = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const transactions = await query(
      'SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC',
      [users[0].id]
    );

    return res.json(transactions.map(t => ({
      id: t.id, type: t.type, amount: t.amount, status: t.status,
      method: t.method, note: t.note,
      paymentId: t.paymentId, payAddress: t.payAddress,
      payAmount: t.payAmount, payCurrency: t.payCurrency,
      payStatus: t.payStatus, invoiceUrl: t.invoiceUrl,
      createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
    })));
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createTransaction(req, res) {
  try {
    const { email, type, amount, method, note, accountType } = req.body;

    if (!email || !type || !amount) return res.status(400).json({ error: 'email, type, and amount are required' });
    if (!['deposit', 'withdraw'].includes(type)) return res.status(400).json({ error: 'type must be deposit or withdraw' });
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const users = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];

    const isRealMethod = method && method !== 'demo' && !method.includes('demo');
    const isReal = req.body.isReal !== undefined ? Boolean(req.body.isReal) : (accountType === 'real' || isRealMethod);
    const balanceField = isReal ? 'realBalance' : 'demoBalance';
    const currentBalance = user[balanceField];

    if (type === 'withdraw' && currentBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    // FINANCIAL SAFETY RULE:
    // All real deposits MUST ALWAYS start as 'pending'.
    // Balance is ONLY credited when a verified server-to-server gateway callback/webhook is received.
    const isDeposit = type === 'deposit';
    const isNowPayments = isReal && isDeposit && (method === 'crypto_bep20' || method === 'crypto_trc20');

    const txStatus = isDeposit ? (isReal ? 'pending' : 'completed') : (isReal ? 'pending' : 'completed');
    const adjustBalance = txStatus === 'completed' && (!isDeposit || !isReal);
    const txId = uuidv4();

    // Create NOWPayments payment and invoice for crypto deposits
    let nowPaymentsData = null;
    let invoiceData = null;
    if (isNowPayments) {
      try {
        const payCurrency = method === 'crypto_bep20' ? 'usdtbsc' : 'usdttrc20';
        nowPaymentsData = await createPayment(amount, payCurrency, txId);
        try {
          invoiceData = await createInvoice(amount, txId, payCurrency);
        } catch (e) {
          console.warn('[NOWPayments] Invoice creation fallback warning:', e.message);
        }
      } catch (err) {
        console.error('[NOWPayments] Payment creation failed:', err.message);
        return res.status(400).json({ error: `Payment gateway error: ${err.message}` });
      }
    }

    // Save transaction to DB
    await transaction(async (tx) => {
      if (adjustBalance) {
        const sign = type === 'deposit' ? '+' : '-';
        await tx.query(
          `UPDATE users SET balance = balance ${sign} ?, ${balanceField} = ${balanceField} ${sign} ?, updatedAt = NOW() WHERE id = ?`,
          [amount, amount, user.id]
        );
      }

      await tx.query(
        `INSERT INTO transactions (id, userId, type, amount, status, method, note, paymentId, payAddress, payAmount, payCurrency, payStatus, invoiceUrl, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          txId, 
          user.id, 
          type, 
          amount, 
          txStatus, 
          method || (isReal ? 'bank' : 'demo'), 
          note || null,
          nowPaymentsData?.id || nowPaymentsData?.payment_id || null,
          nowPaymentsData?.pay_address || null,
          nowPaymentsData?.pay_amount || null,
          nowPaymentsData?.pay_currency || (method === 'crypto_bep20' ? 'usdtbsc' : 'usdttrc20'),
          nowPaymentsData?.payment_status || 'waiting',
          invoiceData?.invoice_url || nowPaymentsData?.invoice_url || null
        ]
      );
    });

    const updatedUser = (await query('SELECT balance, demoBalance, realBalance FROM users WHERE id = ? LIMIT 1', [user.id]))[0];
    const tx = (await query('SELECT * FROM transactions WHERE id = ? LIMIT 1', [txId]))[0];

    if (txStatus === 'completed' && type === 'deposit') {
      const { createReferralDepositBonuses } = require('../helpers/referral-bonus');
      createReferralDepositBonuses(user.id, user.name || user.email, amount, txId).catch((err) => {
        console.error('[transactionController] createReferralDepositBonuses error:', err);
      });
    }

    return res.status(201).json({
      id: tx.id, type: tx.type, amount: tx.amount, status: tx.status,
      method: tx.method, note: tx.note,
      paymentId: tx.paymentId, payAddress: tx.payAddress,
      payAmount: tx.payAmount, payCurrency: tx.payCurrency,
      payStatus: tx.payStatus, invoiceUrl: tx.invoiceUrl,
      newBalance: updatedUser?.[balanceField] || 0,
      newDemoBalance: updatedUser?.demoBalance || 0,
      newRealBalance: updatedUser?.realBalance || 0,
      createdAt: tx.createdAt?.toISOString?.() ?? tx.createdAt,
    });
  } catch (error) {
    console.error('Transaction creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTransactionStatus(req, res) {
  try {
    const { txId, paymentId } = req.query;
    const targetId = txId || paymentId;
    if (!targetId) return res.status(400).json({ error: 'txId or paymentId is required' });

    const rows = await query(
      'SELECT * FROM transactions WHERE id = ? OR paymentId = ? LIMIT 1',
      [targetId, targetId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    const tx = rows[0];

    // Live verification for pending crypto deposits
    if (tx.status === 'pending' && tx.paymentId) {
      try {
        const { getPaymentStatus } = require('../helpers/nowpayments');
        const nowPayDetails = await getPaymentStatus(tx.paymentId);
        if (nowPayDetails) {
          const npStatus = nowPayDetails.payment_status;
          console.log(`[getTransactionStatus] Live NOWPayments status for Tx ${tx.id} (${tx.paymentId}): ${npStatus}`);

          if (['finished', 'confirmed', 'sending'].includes(npStatus)) {
            const { settleCryptoDeposit } = require('../helpers/crypto-deposit');
            await settleCryptoDeposit(tx, nowPayDetails);
            // Refresh tx data from DB after crediting
            const updatedRows = await query('SELECT * FROM transactions WHERE id = ? LIMIT 1', [tx.id]);
            if (updatedRows.length > 0) Object.assign(tx, updatedRows[0]);
          } else if (['failed', 'expired'].includes(npStatus)) {
            await query("UPDATE transactions SET status = 'failed', payStatus = ?, updatedAt = NOW() WHERE id = ?", [npStatus, tx.id]);
            tx.status = 'failed';
            tx.payStatus = npStatus;
          } else if (npStatus && npStatus !== tx.payStatus) {
            await query("UPDATE transactions SET payStatus = ?, updatedAt = NOW() WHERE id = ?", [npStatus, tx.id]);
            tx.payStatus = npStatus;
          }
        }
      } catch (err) {
        console.warn(`[getTransactionStatus] Live status check warning for Tx ${tx.id}:`, err.message);
      }
    }

    return res.json({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      method: tx.method,
      note: tx.note,
      paymentId: tx.paymentId,
      payAddress: tx.payAddress,
      payAmount: tx.payAmount,
      payCurrency: tx.payCurrency,
      payStatus: tx.payStatus,
      invoiceUrl: tx.invoiceUrl,
      createdAt: tx.createdAt,
    });
  } catch (error) {
    console.error('Fetch transaction status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function cancelTransaction(req, res) {
  try {
    const { txId } = req.body;
    if (!txId) return res.status(400).json({ error: 'txId is required' });

    const txs = await query('SELECT * FROM transactions WHERE id = ? LIMIT 1', [txId]);
    if (txs.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    const dbTx = txs[0];

    if (dbTx.status !== 'pending') {
      return res.status(400).json({ error: `Cannot cancel transaction with status ${dbTx.status}` });
    }

    await query(
      "UPDATE transactions SET status = 'failed', payStatus = 'expired', updatedAt = NOW() WHERE id = ?",
      [dbTx.id]
    );

    console.log(`[Transaction] User cancelled transaction ${dbTx.id}`);
    return res.json({ success: true });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getTransactions, createTransaction, getTransactionStatus, cancelTransaction };
