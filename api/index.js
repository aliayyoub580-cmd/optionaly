const app = require('../backend/src/server');

module.exports = (req, res) => {
  try {
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Error]', err);
    return res.status(500).json({ error: 'Server error: ' + (err.message || err) });
  }
};
