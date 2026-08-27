const crypto = require('crypto');
const https = require('https');

const baseUrl = (process.env.WPAY_BASE_URL || 'https://api.wpay.life').replace(/\/$/, '');
const merchantId = (process.env.WPAY_MERCHANT_ID || '5063').toString();
const apiKey = process.env.WPAY_API_KEY || '1a1cd5e2f154863a77a6158392cdbf26';

/**
 * Generates MD5 signature according to WPay / OKExPay specification.
 * Sorts non-empty keys (excluding 'sign') lexicographically,
 * builds query string, appends &key=API_KEY, and produces MD5 hex lowercase.
 *
 * @param {Object} params Request/callback parameter dictionary
 * @returns {string} MD5 signature lowercase
 */
function generateSignature(params) {
  const keys = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();

  const stringA = keys.map((k) => `${k}=${params[k]}`).join('&');
  const stringSignTemp = `${stringA}&key=${apiKey}`;

  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toLowerCase();
}

/**
 * Verifies incoming WPay callback signature.
 *
 * @param {Object} payload Callback payload
 * @returns {boolean} True if signature matches
 */
function verifySignature(payload) {
  if (!payload || !payload.sign) return false;
  const expectedSign = generateSignature(payload);
  return expectedSign.toLowerCase() === payload.sign.toString().toLowerCase();
}

/**
 * Initiates a PKR PayIn request to WPay /v1/Collect API enforcing IPv4 socket routing and user identification metadata.
 *
 * @param {Object} options Payment collection options
 * @param {string} options.outTradeNo Unique order/transaction ID
 * @param {number|string} options.amount Payment amount (PKR integer)
 * @param {string} options.payType Payment type code ('JZ', 'EP', 'QR', 'BANK', 'TRANSFER', etc.)
 * @param {string} [options.attach] Custom attach data (e.g. userId)
 * @param {string} [options.notifyUrl] Webhook callback URL
 * @param {string} [options.returnUrl] Frontend redirect URL after success
 * @param {string} [options.userName] User's full name
 * @param {string} [options.uid] Unique user ID / email
 * @param {string} [options.phone] User phone number
 * @returns {Promise<Object>} Response object containing code, msg, data.url, data.transaction_Id
 */
async function createPayIn({ outTradeNo, amount, payType, attach = '', notifyUrl, returnUrl, userName, uid, phone }) {
  const url = `${baseUrl}/v1/Collect`;

  const defaultNotifyUrl = 'https://api.optionaly.com/api/payment/wpay-webhook';
  const defaultReturnUrl = `https://optionaly.com/checkout/${outTradeNo}`;

  // Sanitize user parameters to match strict WPay / Class II gateway format rules (uid max 16 chars)
  const cleanUserName = (userName || 'Customer').toString().replace(/[^a-zA-Z0-9]/g, '').slice(0, 30) || 'Customer';
  const cleanUid = ((uid || attach || '1001').toString().replace(/[^a-zA-Z0-9]/g, '') || '1001').slice(0, 16);
  let cleanPhone = (phone || '03001234567').toString().replace(/\D/g, '');
  if (cleanPhone.startsWith('92') && cleanPhone.length === 12) {
    cleanPhone = '0' + cleanPhone.slice(2);
  } else if (!cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '0' + cleanPhone;
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    cleanPhone = '03001234567';
  }

  const payload = {
    mchId: merchantId,
    currency: 'PKR',
    out_trade_no: outTradeNo.toString().replace(/[^a-zA-Z0-9]/g, ''),
    pay_type: payType || 'TRANSFER',
    money: Math.round(Number(amount)).toString(),
    attach: attach ? attach.toString() : '',
    notify_url: notifyUrl || defaultNotifyUrl,
    returnUrl: returnUrl || defaultReturnUrl,
    userName: cleanUserName,
    uid: cleanUid,
    phone: cleanPhone,
  };

  // Generate signature including non-empty user metadata (userName, uid, phone)
  payload.sign = generateSignature(payload);

  console.log('[WPay] Sending Collect request over IPv4 with user params:', { ...payload, sign: '***' });

  const urlencoded = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) {
    urlencoded.append(k, v);
  }

  const postData = urlencoded.toString();

  // Enforce IPv4 socket connection to match WPay whitelisted IPv4
  const resText = await new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });

  let data;
  try {
    data = JSON.parse(resText);
  } catch (e) {
    console.error('[WPay] Failed to parse JSON response:', resText);
    throw new Error(`WPay server returned invalid response format: ${resText.substring(0, 100)}`);
  }

  console.log('[WPay] Collect Response Body:', resText);

  if (data.code !== 0) {
    let errorMsg = data.msg || `WPay error code ${data.code}`;
    if (data.code === 4) {
      errorMsg = 'WPay Merchant Account 5063 is pending live activation/settlement with WPay support (code 4: account abnormal).';
    } else if (data.code === 5) {
      errorMsg = 'WPay signature validation error (code 5).';
    } else if (data.code === 16) {
      errorMsg = `WPay IP Whitelist Error (code 16): ${data.msg}`;
    }
    console.error('[WPay] Collect request failed:', data);
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Initiates a PKR PayOut (Withdrawal) request to WPay /v1/Withdraw API.
 *
 * @param {Object} options Payout options
 * @param {string} options.outTradeNo Unique order/transaction ID
 * @param {number|string} options.amount Payout amount (PKR integer)
 * @param {string} [options.payType] Payout type code ('TRANSFER', 'JZ', 'EP', etc.)
 * @param {string} options.accountNumber Recipient EasyPaisa/JazzCash/Bank account number
 * @param {string} [options.userName] Recipient account holder name
 * @param {string} [options.phone] User phone number
 * @returns {Promise<Object>} Response object containing code, msg, data
 */
async function createPayOut({ outTradeNo, amount, payType, accountNumber, userName, phone }) {
  const url = `${baseUrl}/v1/Withdraw`;
  const cleanUserName = (userName || 'Customer').toString().replace(/[^a-zA-Z0-9]/g, '').slice(0, 30) || 'Customer';
  let cleanPhone = (phone || accountNumber || '03001234567').toString().replace(/\D/g, '');
  if (cleanPhone.startsWith('92') && cleanPhone.length === 12) {
    cleanPhone = '0' + cleanPhone.slice(2);
  } else if (!cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '0' + cleanPhone;
  }
  if (!cleanPhone || cleanPhone.length < 10) cleanPhone = '03001234567';

  const payload = {
    mchId: merchantId,
    currency: 'PKR',
    out_trade_no: outTradeNo.toString().replace(/[^a-zA-Z0-9]/g, ''),
    pay_type: payType || 'TRANSFER',
    money: Math.round(Number(amount)).toString(),
    account_number: accountNumber || cleanPhone,
    account_name: cleanUserName,
    phone: cleanPhone,
    notify_url: 'https://api.optionaly.com/api/payment/wpay-payout-webhook',
  };

  payload.sign = generateSignature(payload);

  console.log('[WPay Payout] Sending Withdraw request:', { ...payload, sign: '***' });

  const urlencoded = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) {
    urlencoded.append(k, v);
  }
  const postData = urlencoded.toString();

  const resText = await new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });

  let data;
  try {
    data = JSON.parse(resText);
  } catch (e) {
    console.error('[WPay Payout] Invalid response JSON:', resText);
    throw new Error(`WPay payout returned invalid format: ${resText.substring(0, 100)}`);
  }

  console.log('[WPay Payout] Response:', data);
  return data;
}

module.exports = {
  generateSignature,
  verifySignature,
  createPayIn,
  createPayOut,
  merchantId,
};
