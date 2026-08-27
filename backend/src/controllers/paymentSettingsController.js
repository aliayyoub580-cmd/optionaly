const { query } = require('../helpers/db');

async function getPaymentSettings(req, res, next) {
  try {
    const settings = await query(
      'SELECT id, label, method, details, extraInfo FROM payment_settings WHERE isActive = 1 ORDER BY sortOrder ASC'
    );
    return res.json(settings);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { getPaymentSettings };