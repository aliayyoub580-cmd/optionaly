const { query } = require('../helpers/db');
const { v4: uuidv4 } = require('uuid');

// GET — fetch messages for a chat room
async function getMessages(req, res, next) {
  try {
    const rawRoomId = req.query.roomId;
    if (!rawRoomId) return res.status(400).json({ error: 'roomId required' });

    const chatRoomId = String(rawRoomId).toLowerCase().trim();

    // Check if user exists to include both email and ID in room matching
    const userRows = await query('SELECT id, email FROM users WHERE LOWER(email) = ? OR id = ? LIMIT 1', [chatRoomId, rawRoomId]);
    let roomIds = [chatRoomId];
    if (userRows.length > 0) {
      const u = userRows[0];
      if (u.email) roomIds.push(u.email.toLowerCase().trim());
      if (u.id) roomIds.push(String(u.id).toLowerCase().trim());
    }
    roomIds = Array.from(new Set(roomIds));

    const placeholders = roomIds.map(() => '?').join(', ');

    const messages = await query(
      `SELECT * FROM chat_messages WHERE LOWER(chatRoomId) IN (${placeholders}) ORDER BY createdAt ASC LIMIT 300`,
      roomIds
    );

    // If requested by admin or marked as read, update unread messages
    const requesterRole = req.query.role || req.user?.role;
    if (requesterRole === 'admin') {
      try {
        await query(
          `UPDATE chat_messages SET isRead = 1 WHERE LOWER(chatRoomId) IN (${placeholders}) AND senderRole = 'user' AND isRead = 0`,
          roomIds
        );
      } catch (e) {}
    }

    return res.json(messages);
  } catch (err) {
    console.error('[Chat GET]', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Vercel's deployment directory is read-only.  Resolve and create a writable
// directory only when an upload request arrives; `/tmp` is available for the
// request lifetime in serverless environments.
const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'optionaly', 'chat')
  : path.join(__dirname, '..', '..', 'uploads', 'chat');

function ensureUploadDirectory(cb) {
  fs.mkdir(uploadsDir, { recursive: true }, (error) => cb(error || null, uploadsDir));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => ensureUploadDirectory(cb),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${Date.now()}_${name}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png'];
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (!allowedExts.includes(ext) || !allowedMimes.includes(file.mimetype.toLowerCase())) {
    return cb(new Error('Only JPG, JPEG, and PNG image files are allowed'), false);
  }
  cb(null, true);
};

const chatUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

async function uploadAttachment(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'document';
    return res.json({
      url: fileUrl,
      type: fileType,
      name: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error('[Chat Upload]', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

// POST — send a message
async function sendMessage(req, res, next) {
  try {
    const { chatRoomId: rawRoomId, senderRole, senderName, content, attachmentUrl, attachmentType, attachmentName, attachmentSize } = req.body;

    const trimmedContent = String(content || '').trim().slice(0, 2000);
    const finalAttachmentUrl = attachmentUrl ? String(attachmentUrl).trim() : (req.file ? `/uploads/chat/${req.file.filename}` : null);
    const finalAttachmentType = attachmentType ? String(attachmentType).trim() : (req.file ? (req.file.mimetype.startsWith('image/') ? 'image' : 'document') : null);
    const finalAttachmentName = attachmentName ? String(attachmentName).trim() : (req.file ? req.file.originalname : null);
    const finalAttachmentSize = attachmentSize ? Number(attachmentSize) : (req.file ? req.file.size : null);

    if (!trimmedContent && !finalAttachmentUrl) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const finalSenderRole = ['user', 'admin'].includes(senderRole) ? senderRole : 'user';
    const chatRoomId = String(rawRoomId || 'guest_user').toLowerCase().trim();
    const finalSenderName = String(senderName || (finalSenderRole === 'admin' ? 'Admin' : 'Customer')).trim();
    const id = uuidv4();
    const isRead = finalSenderRole === 'admin' ? 1 : 0;

    try {
      await query(
        `INSERT INTO chat_messages (id, chatRoomId, senderRole, senderName, content, attachmentUrl, attachmentType, attachmentName, attachmentSize, isRead, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, chatRoomId, finalSenderRole, finalSenderName, trimmedContent || (finalAttachmentType === 'image' ? '[Image Attachment]' : '[File Attachment]'), finalAttachmentUrl, finalAttachmentType, finalAttachmentName, finalAttachmentSize, isRead]
      );
    } catch (dbErr) {
      await query(
        'INSERT INTO chat_messages (id, chatRoomId, senderRole, senderName, content, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [id, chatRoomId, finalSenderRole, finalSenderName, trimmedContent || finalAttachmentUrl || '[Attachment]', isRead]
      );
    }

    const rows = await query('SELECT * FROM chat_messages WHERE id = ? LIMIT 1', [id]);
    const message = rows[0];

    const io = req.app.get('io');
    if (io) {
      io.to(chatRoomId).emit('chat_message', message);
      io.to(chatRoomId.toLowerCase()).emit('chat_message', message);
      io.to('admin').emit('chat_message', message);
      io.emit('chat_message_global', message);
    }

    return res.json(message);
  } catch (err) {
    console.error('[Chat POST]', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

// GET — list all chat rooms with last message & unread count (for admin)
async function getRooms(req, res, next) {
  try {
    const allMessages = await query(
      `SELECT m.chatRoomId, m.senderRole, m.senderName, m.content, m.isRead, m.createdAt,
              u.name AS userName, u.email AS userEmail
       FROM chat_messages m
       LEFT JOIN users u ON (LOWER(u.email) = LOWER(m.chatRoomId) OR u.id = m.chatRoomId)
       ORDER BY m.createdAt DESC LIMIT 2000`
    );

    const roomMap = new Map();
    for (const msg of allMessages) {
      const canonicalKey = (msg.userEmail ? msg.userEmail.toLowerCase().trim() : msg.chatRoomId.toLowerCase().trim());
      if (!roomMap.has(canonicalKey)) {
        roomMap.set(canonicalKey, {
          roomId: canonicalKey,
          lastMessage: msg.content,
          lastSender: msg.senderName,
          lastSenderRole: msg.senderRole,
          lastAt: msg.createdAt,
          userName: msg.userName || msg.senderName || 'Customer',
          userEmail: msg.userEmail || canonicalKey,
          unreadCount: 0,
        });
      }

      if (msg.senderRole === 'user' && (msg.isRead === 0 || msg.isRead === false)) {
        const r = roomMap.get(canonicalKey);
        r.unreadCount += 1;
      }
    }

    const rooms = Array.from(roomMap.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    return res.json(rooms);
  } catch (err) {
    console.error('[Chat Rooms GET]', err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
}

module.exports = { getMessages, sendMessage, getRooms, uploadAttachment, chatUpload };
