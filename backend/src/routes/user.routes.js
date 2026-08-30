const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Multer Storage Configuration for Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.VERCEL
      ? path.join(os.tmpdir(), 'optionaly', 'kyc')
      : path.join(__dirname, '..', '..', 'uploads');
    fs.mkdir(uploadDir, { recursive: true }, (error) => cb(error || null, uploadDir));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const { getUser, patchUser, submitKyc } = require('../controllers/userController');

router.get('/', getUser);
router.put('/', patchUser);
router.patch('/', patchUser);
router.post('/kyc-submit', upload.single('document'), submitKyc);

module.exports = router;
