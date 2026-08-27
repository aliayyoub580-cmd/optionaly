const { query, transaction } = require('../helpers/db');
const { verifyIpnSignature } = require('../helpers/nowpayments');
const wpay = require('../helpers/wpay');

/**
 * Creates a WPay PKR deposit payment order.
 */
async function createWPayOrder(req, res) {
  try {
    const { email, userId, amount, payType } = req.body;

    let targetUserId = req.user?.id || userId;
    let userName = req.user?.name || 'Customer';
    let userEmail = req.user?.email || email || '';
    let userPhone = req.user?.phone || '03001234567';

    if (email || targetUserId) {
      const users = await query('SELECT id, name, email FROM users WHERE email = ? OR id = ? LIMIT 1', [email || '', targetUserId || '']);
      if (users.length > 0) {
        targetUserId = users[0].id;
        userName = users[0].name || userName;
        userEmail = users[0].email || userEmail;
      }
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'Valid user email or userId is required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      return res.status(400).json({ error: 'Minimum deposit amount is PKR 100.' });
    }

    // Class II Merchants must use 'TRANSFER' channel for all PKR cashier payments as designated by WPay backoffice
    const selectedPayType = 'TRANSFER';

    const USD_TO_PKR = 277.48;
    const orderId = `WPAY${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Create pending transaction in DB using exact database schema columns (method, note, payCurrency)
    await query(
      `INSERT INTO transactions (id, userId, type, amount, status, method, note, payCurrency, createdAt, updatedAt)
       VALUES (?, ?, 'deposit', ?, 'pending', 'wpay', ?, 'PKR', NOW(), NOW())`,
      [orderId, targetUserId, numericAmount, selectedPayType]
    );

    // Call WPay API with required Class II user identification parameters (use targetUserId for uid, max 16 chars)
    const wpayRes = await wpay.createPayIn({
      outTradeNo: orderId,
      amount: numericAmount,
      payType: selectedPayType,
      attach: targetUserId,
      userName: userName || 'Customer',
      uid: targetUserId || 'user_1001',
      phone: userPhone || '03001234567',
    });

    let paymentUrl = wpayRes.data?.url;
    const wpayTxId = wpayRes.data?.transaction_Id;

    if (!paymentUrl && wpayTxId) {
      paymentUrl = `https://cashier.wpay.life/Cashier/Toloader/PKR/${wpayTxId}`;
    }

    if (!paymentUrl) {
      console.error('[WPay API Response Error]', wpayRes);
      const userErr = wpayRes.msg === 'fail' || !wpayRes.msg
        ? 'Payment gateway is initializing. Please try again.'
        : wpayRes.msg;
      return res.status(400).json({ error: userErr });
    }

    // Store platform transaction_Id
    await query(
      'UPDATE transactions SET paymentId = ?, invoiceUrl = ?, updatedAt = NOW() WHERE id = ?',
      [wpayTxId, paymentUrl, orderId]
    );

    return res.json({
      success: true,
      orderId,
      paymentUrl,
      wpayTransactionId: wpayTxId,
    });
  } catch (err) {
    console.error('[WPay Create Order Exception]', err);
    return res.status(500).json({ error: err.message || 'Payment gateway connection error. Please try again.' });
  }
}

/**
 * Webhook callback handler for WPay (OKExPay) notifications.
 * Expects application/x-www-form-urlencoded or JSON payload.
 * Must respond with the plain string "success".
 */
async function handleWPayWebhook(req, res) {
  try {
    const payload = { ...req.query, ...req.body };

    console.log('[WPay Webhook] Received notification:', payload);

    if (!payload || !payload.sign) {
      console.warn('[WPay Webhook] Missing signature in payload');
      return res.status(400).send('fail');
    }

    // Verify signature
    const isValid = wpay.verifySignature(payload);
    if (!isValid) {
      console.warn('[WPay Webhook] Invalid signature!');
      return res.status(401).send('invalid sign');
    }

    const {
      out_trade_no,
      transaction_Id,
      money,
      pay_money,
      status,
    } = payload;

    const orderId = out_trade_no;
    const statusNum = parseInt(status, 10);
    const USD_TO_PKR = 277.48;

    // Log webhook event for audit (idempotency key)
    const logId = `wpay_${transaction_Id || orderId}_${status}`;
    const logExists = await query('SELECT id FROM webhook_logs WHERE id = ? LIMIT 1', [logId]);
    if (logExists.length > 0) {
      console.log(`[WPay Webhook] Event ${logId} already processed. Returning success.`);
      return res.send('success');
    }

    await query(
      'INSERT INTO webhook_logs (id, payload, createdAt) VALUES (?, ?, NOW())',
      [logId, JSON.stringify(payload)]
    );

    // Find database transaction supporting both exact id and stripped alphanumeric orderId
    const cleanOrderId = (orderId || '').toString().replace(/[^a-zA-Z0-9]/g, '');
    const txs = await query(
      "SELECT * FROM transactions WHERE id = ? OR id = ? LIMIT 1",
      [orderId, cleanOrderId]
    );

    if (txs.length === 0) {
      // FIX: release the idempotency key. The order row may simply not be
      // committed yet. If we keep the log row here, every gateway retry is
      // discarded as a "duplicate" and the deposit stays Pending forever,
      // which is exactly why deposits were ending up in manual approval.
      await query('DELETE FROM webhook_logs WHERE id = ?', [logId]);
      console.warn(`[WPay Webhook] Order ${orderId} (${cleanOrderId}) not found yet. Idempotency key released for retry.`);
      return res.send('success');
    }
    const dbTx = txs[0];

    // Status: 1 = Payment Success, 2 = Payment Failed, 0 = Pending
    if (statusNum === 1 && dbTx.status === 'pending') {
      const creditPkr = parseFloat(pay_money || money || dbTx.amount);
      const creditUsd = Math.round((creditPkr / USD_TO_PKR) * 100) / 100;

      await transaction(async (tx) => {
        const currentTx = (await tx.query('SELECT status, userId, amount FROM transactions WHERE id = ? FOR UPDATE', [dbTx.id]))[0];
        if (currentTx && currentTx.status === 'pending') {
          // Update transaction status atomically
          await tx.query(
            "UPDATE transactions SET status = 'completed', payStatus = '1', updatedAt = NOW() WHERE id = ?",
            [dbTx.id]
          );
          // Credit user wallet balance in USD
          await tx.query(
            'UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, updatedAt = NOW() WHERE id = ?',
            [creditUsd, creditUsd, currentTx.userId]
          );
          console.log(`[WPay Webhook] Order ${dbTx.id} completed. User ${currentTx.userId} credited $${creditUsd} USD (${creditPkr} PKR)`);
          
          const { createReferralDepositBonuses } = require('../helpers/referral-bonus');
          const userRows = await query('SELECT name FROM users WHERE id = ? LIMIT 1', [currentTx.userId]);
          const userName = userRows[0]?.name || 'User';
          createReferralDepositBonuses(currentTx.userId, userName, creditUsd, dbTx.id).catch(e =>
            console.error('[WPay Referral Bonus Error]', e)
          );
        }
      });
    } else if (statusNum === 2 && dbTx.status === 'pending') {
      await query(
        "UPDATE transactions SET status = 'failed', payStatus = '2', updatedAt = NOW() WHERE id = ?",
        [dbTx.id]
      );
      console.log(`[WPay Webhook] Order ${dbTx.id} marked as failed.`);
    }

    return res.send('success');
  } catch (err) {
    // FIX: an exception must not consume the idempotency key either.
    console.error('[WPay Webhook Exception]', err.message);
    try {
      const p = { ...req.query, ...req.body };
      const rid = `wpay_${p.transaction_Id || p.out_trade_no}_${p.status}`;
      await query('DELETE FROM webhook_logs WHERE id = ?', [rid]);
      console.warn(`[WPay Webhook] Released idempotency key ${rid} after failure so the gateway can retry.`);
    } catch (_) { /* best effort */ }
    return res.status(500).send('fail');
  }
}

/**
 * Reconciles existing approved deposits (both PKR WPay and Crypto NOWPayments) that were not credited to user wallet.
 */
async function reconcileWPayDeposits(req, res) {
  try {
    const USD_TO_PKR = 277.48;
    const logs = await query("SELECT payload FROM webhook_logs");
    let reconciledCount = 0;
    const reconciledDetails = [];

    for (const log of logs) {
      try {
        const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
        if (!payload) continue;

        // 1. Check WPay PKR Approval
        if ((payload.status == 1 || payload.status === '1') && payload.out_trade_no) {
          const orderId = payload.out_trade_no;
          const cleanOrderId = orderId.replace(/[^a-zA-Z0-9]/g, '');
          const txs = await query(
            "SELECT * FROM transactions WHERE id = ? OR id = ? LIMIT 1",
            [orderId, cleanOrderId]
          );

          if (txs.length > 0 && txs[0].status === 'pending') {
            const dbTx = txs[0];
            const creditPkr = parseFloat(payload.pay_money || payload.money || dbTx.amount);
            const creditUsd = Math.round((creditPkr / USD_TO_PKR) * 100) / 100;

            await transaction(async (tx) => {
              const currentTx = (await tx.query('SELECT status, userId FROM transactions WHERE id = ? FOR UPDATE', [dbTx.id]))[0];
              if (currentTx && currentTx.status === 'pending') {
                await tx.query(
                  "UPDATE transactions SET status = 'completed', payStatus = '1', updatedAt = NOW() WHERE id = ?",
                  [dbTx.id]
                );
                await tx.query(
                  'UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, updatedAt = NOW() WHERE id = ?',
                  [creditUsd, creditUsd, currentTx.userId]
                );
                reconciledCount++;
                reconciledDetails.push({ gateway: 'wpay', txId: dbTx.id, userId: currentTx.userId, creditPkr, creditUsd });
                // FIX: a deposit settled by reconciliation must generate the same
                // A/B/C recharge commission as one settled by the live webhook.
                const { createReferralDepositBonuses } = require('../helpers/referral-bonus');
                const uRows = await query('SELECT name FROM users WHERE id = ? LIMIT 1', [currentTx.userId]);
                createReferralDepositBonuses(currentTx.userId, uRows[0]?.name || 'User', creditUsd, dbTx.id)
                  .catch(e => console.error('[Reconcile WPay Referral Bonus Error]', e));
              }
            });
          }
        }

        // 2. Check NOWPayments Crypto Approval
        const isCryptoPaid = ['confirmed', 'finished', 'sending'].includes(payload.payment_status);
        if (isCryptoPaid && payload.order_id) {
          const orderId = payload.order_id;
          const txs = await query("SELECT * FROM transactions WHERE id = ? LIMIT 1", [orderId]);

          if (txs.length > 0 && txs[0].status === 'pending') {
            const dbTx = txs[0];
            const { settleCryptoDeposit } = require('../helpers/crypto-deposit');
            const settled = await settleCryptoDeposit(dbTx, payload);
            if (settled) {
              reconciledCount++;
              reconciledDetails.push({ gateway: 'nowpayments', txId: dbTx.id, userId: dbTx.userId, creditUsd: parseFloat(payload.price_amount || dbTx.amount) });
            }
          }
        }
      } catch (e) {
        console.error('[Reconciliation Single Record Error]', e.message);
      }
    }

    if (res) {
      return res.json({ success: true, reconciledCount, reconciledDetails });
    }
  } catch (err) {
    console.error('[Reconciliation Exception]', err.message);
    if (res) return res.status(500).json({ error: err.message });
  }
}

/**
 * Handle NOWPayments Webhook (Existing Crypto Integration)
 */
async function handleWebhook(req, res) {
  try {
    const xNowPaymentsSig = req.headers['x-nowpayments-sig'];
    const payload = req.body;

    console.log('[NOWPayments Webhook] Received headers:', req.headers);
    console.log('[NOWPayments Webhook] Received payload:', payload);

    if (!xNowPaymentsSig) {
      console.warn('[NOWPayments Webhook] Missing x-nowpayments-sig header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Verify IPN signature
    const isValid = verifyIpnSignature(payload, xNowPaymentsSig);
    if (!isValid) {
      console.warn('[NOWPayments Webhook] Signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const {
      payment_id,
      payment_status,
      order_id,
    } = payload;

    if (!payment_id) {
      return res.status(400).json({ error: 'Missing payment_id' });
    }

    const logId = `${payment_id}_${payment_status}`;
    const logExists = await query('SELECT id FROM webhook_logs WHERE id = ? LIMIT 1', [logId]);
    if (logExists.length > 0) {
      console.log(`[NOWPayments Webhook] Already logged/processed event ${logId}. Skipping.`);
      return res.status(200).send('OK (duplicate skipped)');
    }

    await query(
      'INSERT INTO webhook_logs (id, payload, createdAt) VALUES (?, ?, NOW())',
      [logId, JSON.stringify(payload)]
    );

    const txs = await query('SELECT * FROM transactions WHERE id = ? LIMIT 1', [order_id]);
    if (txs.length === 0) {
      // FIX: release the key so a later IPN retry can still settle this deposit.
      await query('DELETE FROM webhook_logs WHERE id = ?', [logId]);
      console.warn(`[NOWPayments Webhook] Transaction not found for order_id: ${order_id}. Idempotency key released for retry.`);
      return res.status(200).send('OK (transaction not found)');
    }
    const dbTx = txs[0];

    await query(
      'UPDATE transactions SET payStatus = ?, updatedAt = NOW() WHERE id = ?',
      [payment_status, dbTx.id]
    );

    const isPaid = ['confirmed', 'finished', 'sending'].includes(payment_status);
    const isFailed = ['failed', 'expired'].includes(payment_status);

    if (isPaid && dbTx.status === 'pending') {
      const { settleCryptoDeposit } = require('../helpers/crypto-deposit');
      await settleCryptoDeposit(dbTx, payload);
      console.log(`[NOWPayments Webhook] Transaction ${dbTx.id} completed. User ${dbTx.userId} credited.`);
    } else if (isFailed && dbTx.status === 'pending') {
      await query(
        "UPDATE transactions SET status = 'failed', payStatus = ?, updatedAt = NOW() WHERE id = ?",
        [payment_status, dbTx.id]
      );
      console.log(`[NOWPayments Webhook] Transaction ${dbTx.id} marked as failed/expired.`);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[NOWPayments Webhook] Critical error:', err);
    try {
      const rid = `${req.body?.payment_id}_${req.body?.payment_status}`;
      await query('DELETE FROM webhook_logs WHERE id = ?', [rid]);
      console.warn(`[NOWPayments Webhook] Released idempotency key ${rid} after failure so NOWPayments can retry.`);
    } catch (_) { /* best effort */ }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * User Withdrawal Controller (`POST /api/payment/withdraw`).
 * Handles PKR (WPay / EasyPaisa / JazzCash) & Crypto (NOWPayments) withdrawal requests.
 * Enforces authenticated JWT user, atomic DB reservation, real balance safety, and idempotency.
 */
async function createWithdrawal(req, res) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token;
    } else if (req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'qx_trade_secret_key_2026_production';
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload.' });
    }

    const {
      method,
      amount,
      currency = 'USD',
      network = 'BEP20',
      recipientName,
      accountNumber,
      walletAddress,
      phone
    } = req.body;

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount is required.' });
    }

    const USD_TO_PKR = 277.48;
    const isPkr = currency === 'PKR' || method === 'wpay' || method === 'easypaisa' || method === 'jazzcash';
    
    // Calculate required USD deduction from real balance
    const requiredUsd = isPkr
      ? Math.round((numericAmount / USD_TO_PKR) * 100) / 100
      : numericAmount;

    const destDetails = isPkr
      ? `${(method || 'wpay').toUpperCase()} Account: ${accountNumber || phone} (${recipientName || 'Recipient'})`
      : `${currency} ${network} Wallet: ${walletAddress || accountNumber}`;

    if (isPkr && (!accountNumber && !phone)) {
      return res.status(400).json({ error: 'Recipient account number or phone number is required for PKR withdrawal.' });
    }

    if (!isPkr && (!walletAddress && !accountNumber)) {
      return res.status(400).json({ error: 'Crypto wallet address is required for withdrawal.' });
    }

    const orderId = `WITHDRAW_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    let gatewayResult = null;
    let gatewayError = null;

    // Perform Atomic Reservation on User Real Balance
    await transaction(async (tx) => {
      const userRows = await tx.query(
        'SELECT balance, realBalance, name, email FROM users WHERE id = ? FOR UPDATE',
        [userId]
      );

      if (userRows.length === 0) {
        throw new Error('User account not found.');
      }

      const user = userRows[0];
      const availableReal = user.realBalance || 0;

      if (availableReal < requiredUsd) {
        throw new Error(`Insufficient real balance. Available real balance: $${availableReal.toFixed(2)} USD (Requested: $${requiredUsd.toFixed(2)} USD).`);
      }

      // Deduct real balance atomically (reservation)
      await tx.query(
        'UPDATE users SET balance = balance - ?, realBalance = realBalance - ?, updatedAt = NOW() WHERE id = ?',
        [requiredUsd, requiredUsd, userId]
      );

      // Create transaction record
      await tx.query(
        `INSERT INTO transactions (id, userId, type, amount, status, method, note, payCurrency, payAmount, createdAt, updatedAt)
         VALUES (?, ?, 'withdraw', ?, 'pending', ?, ?, ?, ?, NOW(), NOW())`,
        [
          orderId,
          userId,
          requiredUsd,
          method || (isPkr ? 'wpay' : 'crypto'),
          destDetails,
          isPkr ? 'PKR' : (currency || 'USDT'),
          numericAmount,
        ]
      );
    });

    // Attempt Gateway Payout Execution
    if (isPkr) {
      try {
        gatewayResult = await wpay.createPayOut({
          outTradeNo: orderId,
          amount: numericAmount,
          accountNumber: accountNumber || phone,
          userName: recipientName || 'Customer',
          phone: phone || accountNumber,
        });

        if (gatewayResult && gatewayResult.code === 0) {
          await query(
            "UPDATE transactions SET status = 'processing', paymentId = ?, updatedAt = NOW() WHERE id = ?",
            [gatewayResult.data?.transaction_Id || gatewayResult.data?.payoutId || orderId, orderId]
          );
        } else {
          gatewayError = gatewayResult?.msg || `WPay payout error code ${gatewayResult?.code}`;
        }
      } catch (err) {
        console.warn('[WPay Payout Limitation]:', err.message);
        gatewayError = err.message;
      }
    } else {
      try {
        const payRes = await nowpayments.createCryptoPayout(
          numericAmount,
          (currency || 'usdtbsc').toLowerCase(),
          walletAddress || accountNumber
        );
        gatewayResult = payRes.data;
        if (!payRes.ok) {
          gatewayError = payRes.data?.message || payRes.data?.error || `NOWPayments payout error ${payRes.status}`;
        }
      } catch (err) {
        console.warn('[NOWPayments Payout Limitation]:', err.message);
        gatewayError = err.message;
      }
    }

    const updatedUser = (await query('SELECT balance, realBalance FROM users WHERE id = ? LIMIT 1', [userId]))[0];

    return res.status(200).json({
      success: true,
      orderId,
      userId,
      amountRequested: numericAmount,
      currency: isPkr ? 'PKR' : (currency || 'USDT'),
      usdDeducted: requiredUsd,
      status: gatewayError ? 'pending' : 'processing',
      gatewayResponse: gatewayResult || { message: 'Withdrawal created and queued for processing.' },
      gatewayError: gatewayError || null,
      balanceBefore: updatedUser ? updatedUser.realBalance + requiredUsd : 0,
      balanceAfter: updatedUser ? updatedUser.realBalance : 0,
      note: destDetails,
    });
  } catch (err) {
    console.error('[Withdrawal Exception]', err.message);
    const isBalanceErr = err.message.includes('Insufficient real balance') || err.message.includes('User account not found');
    return res.status(isBalanceErr ? 400 : 500).json({ error: err.message });
  }
}

/**
 * Automatic deposit reconciliation sweep.
 *
 * Safety net for the case where a gateway webhook is lost, blocked by the
 * firewall, or arrives before the order row is committed. Every few minutes it
 * replays stored webhook payloads and settles any deposit that the gateway
 * already marked paid but that is still sitting at 'pending'.
 *
 * It reuses reconcileWPayDeposits, so it inherits the same FOR UPDATE lock and
 * the same 'pending' guard: a deposit can never be credited twice.
 */
let reconcileSweepTimer = null;

function startDepositReconciliationSweep(intervalMs) {
  if (reconcileSweepTimer) {
    console.log('[Deposit Sweep] Already running, duplicate start ignored.');
    return reconcileSweepTimer;
  }
  const period = intervalMs || parseInt(process.env.DEPOSIT_SWEEP_MS || '300000', 10);

  const runOnce = async () => {
    try {
      const fakeRes = { json: () => {}, status: () => ({ json: () => {} }) };
      await reconcileWPayDeposits({ query: {}, body: {} }, fakeRes);
    } catch (e) {
      console.error('[Deposit Sweep] Error:', e.message);
    }
  };

  reconcileSweepTimer = setInterval(runOnce, period);
  if (reconcileSweepTimer.unref) reconcileSweepTimer.unref();
  console.log(`[Deposit Sweep] Auto reconciliation active every ${period / 1000}s.`);
  return reconcileSweepTimer;
}

module.exports = {
  createWPayOrder,
  handleWPayWebhook,
  reconcileWPayDeposits,
  createWithdrawal,
  handleWebhook,
  startDepositReconciliationSweep,
};
