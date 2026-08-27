const { query } = require('../helpers/db');

async function getUser(req, res) {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'Email query parameter is required' });

    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    const trades = await query('SELECT profit, status FROM trades WHERE userId = ?', [user.id]);
    const totalTrades = trades.length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit ?? 0), 0);
    const wins = trades.filter((t) => t.status === 'won').length;
    const losses = trades.filter((t) => t.status === 'lost').length;

    const { password, ...safeUser } = user;
    return res.json({
      user: { ...safeUser, createdAt: user.createdAt?.toISOString?.() ?? user.createdAt },
      stats: { totalTrades, wins, losses, totalPnL },
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const { hashPassword, verifyPassword } = require('./authController');

async function patchUser(req, res) {
  try {
    const { email, accountType, name, phone, country, currentPassword, newPassword } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    if (currentPassword && newPassword) {
      const validCur = await verifyPassword(currentPassword, user.password);
      if (!validCur) return res.status(400).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 4) return res.status(400).json({ error: 'New password must be at least 4 characters' });
      const hashedNew = await hashPassword(newPassword);
      await query('UPDATE users SET password = ?, updatedAt = UTC_TIMESTAMP() WHERE email = ?', [hashedNew, email]);
      const updated = (await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]))[0];
      const { password, ...safeUser } = updated;
      return res.json({ user: safeUser, message: 'Password updated successfully' });
    }

    if (accountType) {
      if (!['demo', 'real'].includes(accountType)) return res.status(400).json({ error: 'Invalid accountType' });
      await query('UPDATE users SET accountType = ?, updatedAt = UTC_TIMESTAMP() WHERE email = ?', [accountType, email]);
      const updated = (await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]))[0];
      const { password, ...safeUser } = updated;
      return res.json({ user: safeUser });
    }

    const fields = [];
    const vals = [];
    if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
    if (phone !== undefined) { fields.push('phone = ?'); vals.push(phone); }
    if (country !== undefined) { fields.push('country = ?'); vals.push(country); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    fields.push('updatedAt = UTC_TIMESTAMP()');
    vals.push(email);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE email = ?`, vals);
    const updated = (await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]))[0];
    const { password, ...safeUser } = updated;
    return res.json({ user: safeUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('User update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function submitKyc(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!req.file) return res.status(400).json({ error: 'Document file is required' });

    const fileUrl = `/uploads/${req.file.filename}`;
    
    await query(
      "UPDATE users SET kycStatus = 'pending', kycDocument = ?, kycSubmittedAt = UTC_TIMESTAMP(), kycRejectionReason = NULL, updatedAt = UTC_TIMESTAMP() WHERE email = ?",
      [fileUrl, email]
    );

    const updated = (await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]))[0];
    const { password, ...safeUser } = updated;
    
    // Notify admin room via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_kyc_submission', { userId: updated.id, name: updated.name, email: updated.email });
    }

    return res.json({ success: true, user: safeUser, fileUrl });
  } catch (error) {
    console.error('KYC submit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getUser, patchUser, submitKyc };