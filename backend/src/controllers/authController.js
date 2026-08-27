const crypto = require('crypto');
const { query, transaction } = require('../helpers/db');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { generateAdminToken, JWT_SECRET } = require('../middleware/adminAuth');

async function hashPassword(pw) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(pw, salt, 1000, 64, 'sha512', (err, derived) => {
      if (err) reject(err);
      resolve(salt + ':' + derived.toString('hex'));
    });
  });
}

async function verifyPassword(pw, hash) {
  if (!hash || !pw) return false;

  // 1. Direct match for plain text passwords (legacy or direct DB updates)
  if (pw === hash) return true;

  // 2. PBKDF2 format (salt:derivedHex)
  if (hash.includes(':')) {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    return new Promise((resolve) => {
      crypto.pbkdf2(pw, salt, 1000, 64, 'sha512', (err, derived) => {
        if (err) resolve(false);
        else resolve(derived.toString('hex') === key);
      });
    });
  }

  // 3. Bcrypt format ($2a$ / $2b$)
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    try {
      const bcrypt = require('bcryptjs');
      return await bcrypt.compare(pw, hash);
    } catch (e) {}
  }

  return false;
}

function generateUserToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

const { generateUniqueReferralCode } = require('../helpers/referral-code');

async function postAuth(req, res) {
  try {
    const { email, name, phone, country, action, password, confirmPassword, accountType, referralCode: providedRefCode, refCode, ref } = req.body;

    if (!email || !password || !action) {
      return res.status(400).json({ error: 'Email, password, and action are required' });
    }

    if (action === 'signup') {
      if (!name) return res.status(400).json({ error: 'Full name is required' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

      const cleanEmail = email.toLowerCase().trim();
      const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
      }

      const hashed = await hashPassword(password);
      const isReal = accountType === 'real';
      const id = uuidv4();
      const newReferralCode = await generateUniqueReferralCode();

      await query(
        `INSERT INTO users (id, email, name, phone, country, password, accountType, balance, demoBalance, realBalance, referralCode, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          id,
          cleanEmail,
          name.trim(),
          phone?.trim() || null,
          country || null,
          hashed,
          isReal ? 'real' : 'demo',
          isReal ? 0 : 10000,
          isReal ? 0 : 10000,
          0,
          newReferralCode,
        ]
      );

      // Process parent referral linkage if code was provided
      const rawRefCode = (providedRefCode || refCode || ref || '').toString().trim().toUpperCase();
      if (rawRefCode) {
        try {
          const referrers = await query(
            'SELECT id, email, name FROM users WHERE UPPER(referralCode) = ? OR id = ? LIMIT 1',
            [rawRefCode, rawRefCode]
          );
          if (referrers.length > 0 && referrers[0].id !== id) {
            const referrer = referrers[0];
            await query('UPDATE users SET referredBy = ? WHERE id = ?', [referrer.id, id]);
            const existingRef = await query('SELECT id FROM referrals WHERE referredId = ? LIMIT 1', [id]);
            if (existingRef.length === 0) {
              try {
                await query(
                  `INSERT INTO referrals (id, referrerId, referredId, level, commissionEarned, status, createdAt)
                   VALUES (?, ?, ?, 1, 0.0, 'active', UTC_TIMESTAMP())`,
                  [uuidv4(), referrer.id, id]
                );
              } catch (e1) {
                await query(
                  `INSERT INTO referrals (id, referrerId, referredId, level, commissionEarned, status, createdAt, updatedAt)
                   VALUES (?, ?, ?, 1, 0.0, 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
                  [uuidv4(), referrer.id, id]
                );
              }
              try {
                await query(
                  `INSERT INTO activities (id, userId, type, message, amount, createdAt)
                   VALUES (?, ?, 'referral_joined', ?, 0, UTC_TIMESTAMP())`,
                  [uuidv4(), referrer.id, `${name.trim()} joined using your referral link`]
                );
              } catch (e2) {
                await query(
                  `INSERT INTO activities (id, userId, type, message, amount, createdAt, updatedAt)
                   VALUES (?, ?, 'referral_joined', ?, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
                  [uuidv4(), referrer.id, `${name.trim()} joined using your referral link`]
                );
              }
              console.log(`[Referral] User ${id} (${cleanEmail}) linked to referrer ${referrer.id} (${referrer.email}) via code ${rawRefCode}`);
            }
          }
        } catch (refErr) {
          console.error('[Referral Link Error]', refErr);
        }
      }

      const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      const newAccount = rows[0];
      const token = generateUserToken(newAccount);
      return res.json({ token, user: sanitizeUser(newAccount), message: 'Account created successfully!' });
    }

    if (action === 'login') {
      const cleanEmail = email.toLowerCase().trim();
      const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
      const user = rows[0];
      const valid = await verifyPassword(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      // Auto-rehash password if stored as plain text or legacy format
      if (!user.password || !user.password.includes(':')) {
        try {
          const secureHash = await hashPassword(password);
          await query('UPDATE users SET password = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?', [secureHash, user.id]);
          console.log(`[Auth] Auto-rehashed legacy password for user ${user.id} (${cleanEmail})`);
        } catch (e) {}
      }

      const token = generateUserToken(user);
      return res.json({ token, user: sanitizeUser(user) });
    }

    return res.status(400).json({ error: "Invalid action. Use 'login' or 'signup'" });
  } catch (error) {
    console.error('Auth error:', error?.message || error);
    const msg = error?.message?.includes('Duplicate entry')
      ? 'This email is already registered. Please sign in.'
      : 'Something went wrong. Please try again.';
    return res.status(500).json({ error: msg });
  }
}

async function postAdminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check environment variables first for secure Admin access
    const envAdminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const envAdminPassword = process.env.ADMIN_PASSWORD || '';

    if (envAdminEmail && envAdminPassword && cleanEmail === envAdminEmail && password === envAdminPassword) {
      const adminUser = {
        id: 'admin_env_user',
        email: envAdminEmail,
        name: 'System Administrator',
        role: 'admin',
      };
      const token = generateAdminToken(adminUser);
      return res.json({
        token,
        user: adminUser,
        message: 'Admin authentication successful',
      });
    }

    // Database lookup fallback
    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const user = rows[0];
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You do not have administrator privileges.' });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = generateAdminToken(user);
    return res.json({
      token,
      user: sanitizeUser(user),
      message: 'Admin authentication successful',
    });
  } catch (error) {
    console.error('Admin login error:', error?.message || error);
    return res.status(500).json({ error: 'Admin login failed' });
  }
}

module.exports = { postAuth, postAdminLogin, hashPassword, verifyPassword };