const { query } = require('../helpers/db');

async function getPublicNews(req, res, next) {
  try {
    const items = await query('SELECT * FROM news_items ORDER BY createdAt DESC LIMIT 20');
    return res.json(items);
  } catch (error) {
    console.error('Public news fetch error:', error);
    return res.json([]);
  }
}

module.exports = { getPublicNews };