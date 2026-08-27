const crypto = require('crypto');
const { query } = require('./db');

/**
 * Generate a unique 8-character uppercase alphanumeric referral code.
 * Ensures the generated code does not conflict with any existing user in the database.
 */
async function generateUniqueReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let unique = false;
  let code = '';

  while (!unique) {
    code = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      code += chars[bytes[i] % chars.length];
    }
    const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
    code = (code.substring(0, 4) + hex).substring(0, 8);

    const rows = await query('SELECT id FROM users WHERE referralCode = ? LIMIT 1', [code]);
    if (rows.length === 0) {
      unique = true;
    }
  }

  return code;
}

module.exports = { generateUniqueReferralCode };
