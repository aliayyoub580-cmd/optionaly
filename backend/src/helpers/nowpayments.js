const crypto = require('crypto');

const apiKey = process.env.NOWPAYMENTS_API_KEY;
const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
const isSandbox = false;

const baseUrl = isSandbox 
  ? 'https://api.sandbox.nowpayments.io/v1' 
  : 'https://api.nowpayments.io/v1';

/**
 * Creates a Payment with NOWPayments.
 * @param {number} amount Fiat amount
 * @param {string} payCurrency Payment currency ticker (e.g. 'usdtbsc', 'usdttrc20')
 * @param {string} orderId Transaction ID
 * @returns {Promise<Object>} NOWPayments payment response containing pay_address, pay_amount, etc.
 */
/**
 * Creates an Invoice with NOWPayments (Hosted Checkout URL / Widget).
 * @param {number} amount Fiat amount in USD
 * @param {string} orderId Transaction ID
 * @param {string} payCurrency Optional currency restriction (e.g. 'usdtbsc', 'usdttrc20')
 * @returns {Promise<Object>} NOWPayments invoice response containing invoice_url, id, etc.
 */
async function createInvoice(amount, orderId, payCurrency) {
  const url = `${baseUrl}/invoice`;
  const body = {
    price_amount: amount,
    price_currency: 'usd',
    ipn_callback_url: 'https://api.optionaly.com/api/payment/webhook',
    order_id: orderId,
    order_description: `Deposit of $${amount} to QX Trade`,
    cancel_url: `https://optionaly.com/checkout/${orderId}`,
    success_url: `https://optionaly.com/checkout/${orderId}`,
  };

  if (payCurrency) {
    body.pay_currency = payCurrency;
  }

  console.log('[NOWPayments] Creating hosted invoice request:', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `NOWPayments error: ${res.statusText}`);
  }
  return data;
}

/**
 * Creates a Direct Payment with NOWPayments.
 * @param {number} amount Fiat amount
 * @param {string} payCurrency Payment currency ticker (e.g. 'usdtbsc', 'usdttrc20')
 * @param {string} orderId Transaction ID
 * @returns {Promise<Object>} NOWPayments payment response containing pay_address, pay_amount, etc.
 */
async function createPayment(amount, payCurrency, orderId) {
  const url = `${baseUrl}/payment`;
  const body = {
    price_amount: amount,
    price_currency: 'usd',
    pay_currency: payCurrency,
    ipn_callback_url: 'https://api.optionaly.com/api/payment/webhook',
    order_id: orderId,
    order_description: `Deposit of $${amount} to QX Trade`
  };

  console.log('[NOWPayments] Creating payment request:', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `NOWPayments error: ${res.statusText}`);
  }
  return data;
}

/**
 * Verifies NOWPayments IPN signature.
 */
function verifyIpnSignature(payload, sigHeader) {
  if (!sigHeader) return false;
  try {
    const sortedString = JSON.stringify(payload, Object.keys(payload).sort());
    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(sortedString);
    return hmac.digest('hex') === sigHeader;
  } catch (err) {
    console.error('[NOWPayments] IPN signature verification error:', err);
    return false;
  }
}

/**
 * Creates a Crypto Payout request with NOWPayments.
 */
async function createCryptoPayout(amount, payCurrency, address, ipnCallbackUrl) {
  const url = `${baseUrl}/payout`;
  const body = {
    withdrawals: [
      {
        address: address,
        currency: payCurrency || 'usdtbsc',
        amount: amount,
        ipn_callback_url: ipnCallbackUrl || 'https://api.optionaly.com/api/payment/crypto-payout-webhook',
      }
    ]
  };

  console.log('[NOWPayments] Creating payout request:', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

/**
 * Gets payment status directly from NOWPayments API.
 * @param {string|number} paymentId NOWPayments Payment ID
 * @returns {Promise<Object>} Payment details including payment_status, pay_amount, actually_paid, pay_address, etc.
 */
async function getPaymentStatus(paymentId) {
  if (!paymentId) return null;
  const url = `${baseUrl}/payment/${paymentId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `NOWPayments getPaymentStatus error: ${res.statusText}`);
  }
  return data;
}

module.exports = {
  createInvoice,
  createPayment,
  getPaymentStatus,
  createCryptoPayout,
  verifyIpnSignature,
};
