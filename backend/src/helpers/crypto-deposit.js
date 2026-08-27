const { query, transaction } = require('./db');
const { v4: uuidv4 } = require('uuid');
const { getPaymentStatus } = require('./nowpayments');

/**
 * Atomically settles a confirmed/finished crypto deposit and credits user balances.
 * @param {Object} tx Transaction row from MySQL
 * @param {Object} paymentDetails Details from NOWPayments webhook or API status response
 * @returns {Promise<boolean>} True if settled, false if already completed or skipped
 */
async function settleCryptoDeposit(tx, paymentDetails) {
  try {
    const paymentStatus = paymentDetails?.payment_status || paymentDetails?.payStatus || 'finished';
    const actuallyPaid = parseFloat(paymentDetails?.actually_paid || paymentDetails?.pay_amount || tx.payAmount || tx.amount);
    const creditUsd = parseFloat(paymentDetails?.price_amount || tx.amount);

    console.log(`[Crypto Deposit Settle] Attempting settlement for Tx ${tx.id} (User: ${tx.userId}, Status: ${paymentStatus}, Amount: $${creditUsd})`);

    let settled = false;

    await transaction(async (dbTx) => {
      // Re-verify that transaction is still pending under lock
      const currentRows = await dbTx.query('SELECT status, userId, amount FROM transactions WHERE id = ? FOR UPDATE', [tx.id]);
      if (currentRows.length === 0 || currentRows[0].status !== 'pending') {
        console.log(`[Crypto Deposit Settle] Tx ${tx.id} is already ${currentRows[0]?.status || 'missing'}. Skipping duplicate credit.`);
        return;
      }

      // 1. Mark transaction as completed
      await dbTx.query(
        "UPDATE transactions SET status = 'completed', payStatus = ?, payAmount = ?, updatedAt = NOW() WHERE id = ?",
        [paymentStatus, actuallyPaid || tx.payAmount, tx.id]
      );

      // 2. Credit user wallet balance in USD (both balance, realBalance, demoBalance)
      await dbTx.query(
        'UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, demoBalance = demoBalance + ?, updatedAt = NOW() WHERE id = ? OR email = ?',
        [creditUsd, creditUsd, creditUsd, tx.userId, tx.userId]
      );

      // 3. Log activity
      await dbTx.query(
        'INSERT INTO activities (id, userId, type, message, amount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [uuidv4(), tx.userId, 'deposit_completed', `Completed Crypto Deposit of $${creditUsd.toFixed(2)} USDT (${tx.method || 'BEP20'})`, creditUsd]
      );

      settled = true;
    });

    if (settled) {
      console.log(`[Crypto Deposit Settle] SUCCESS: Tx ${tx.id} completed. User ${tx.userId} credited $${creditUsd} USD.`);
      
      // 4. Trigger referral deposit bonuses automatically
      try {
        const { createReferralDepositBonuses } = require('./referral-bonus');
        const uRows = await query('SELECT id, name, email FROM users WHERE id = ? OR email = ? LIMIT 1', [tx.userId, tx.userId]);
        const userName = uRows[0]?.name || uRows[0]?.email || 'User';
        const actualUserId = uRows[0]?.id || tx.userId;
        createReferralDepositBonuses(actualUserId, userName, creditUsd, tx.id).catch(e =>
          console.error('[Crypto Deposit Referral Bonus Error]', e)
        );
      } catch (refErr) {
        console.warn('[Crypto Deposit Referral Bonus Trigger Warning]:', refErr.message);
      }
    }

    return settled;
  } catch (err) {
    console.error(`[Crypto Deposit Settle] ERROR settling Tx ${tx.id}:`, err);
    throw err;
  }
}

/**
 * Background worker that sweeps all pending crypto deposits and checks their live on-chain status on NOWPayments.
 */
async function sweepPendingCryptoDeposits() {
  try {
    const pendingCryptoTxs = await query(
      "SELECT * FROM transactions WHERE status = 'pending' AND (method LIKE '%crypto%' OR gateway = 'crypto') AND paymentId IS NOT NULL AND paymentId REGEXP '^[0-9]+$' AND createdAt >= NOW() - INTERVAL 30 DAY ORDER BY createdAt DESC LIMIT 30"
    );

    if (pendingCryptoTxs.length === 0) return;

    for (const tx of pendingCryptoTxs) {
      try {
        const nowPayDetails = await getPaymentStatus(tx.paymentId);
        if (!nowPayDetails) continue;

        const npStatus = nowPayDetails.payment_status;
        if (['finished', 'confirmed', 'sending'].includes(npStatus)) {
          console.log(`[Crypto Sweep] Detected confirmed on-chain payment for Tx ${tx.id} (Payment ${tx.paymentId}, Status: ${npStatus}). Auto-crediting...`);
          await settleCryptoDeposit(tx, nowPayDetails);
        } else if (['failed', 'expired'].includes(npStatus)) {
          console.log(`[Crypto Sweep] Tx ${tx.id} marked ${npStatus} by gateway.`);
          await query("UPDATE transactions SET status = 'failed', payStatus = ?, updatedAt = NOW() WHERE id = ?", [npStatus, tx.id]);
        } else if (npStatus && npStatus !== tx.payStatus) {
          await query("UPDATE transactions SET payStatus = ?, updatedAt = NOW() WHERE id = ?", [npStatus, tx.id]);
        }
      } catch (e) {
        if (!e.message?.includes('404')) {
          console.warn(`[Crypto Sweep] Warning checking Tx ${tx.id} (${tx.paymentId}):`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('[Crypto Sweep Error]:', err);
  }
}

module.exports = {
  settleCryptoDeposit,
  sweepPendingCryptoDeposits,
};
