const { query } = require('./db');

/**
 * Resolve a user by either their ID (UUID) or their email.
 */
async function findUserByIdOrEmail(userIdOrEmail, options) {
  // Try by UUID first
  const byId = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userIdOrEmail]);
  if (byId.length > 0) return byId[0];

  // Fallback to email
  const byEmail = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [userIdOrEmail]);
  return byEmail.length > 0 ? byEmail[0] : null;
}

module.exports = { findUserByIdOrEmail };
