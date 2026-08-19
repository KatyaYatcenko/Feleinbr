import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Той самий DATA_DIR, що й у server/db.js — щоб фото лежали на тому ж
// постійному диску, що й база, і не губились після редеплою.
// Без DATA_DIR (типовий випадок) все має лежати в server/uploads — тобто
// на рівень вище за цю папку (routes), інакше express.static() в index.js
// шукатиме файли не там, куди їх реально зберіг multer, і віддаватиме 404.
const defaultUploadsBase = path.join(__dirname, '..');
const dataDir = process.env.DATA_DIR || defaultUploadsBase;
const uploadsDir = path.join(dataDir, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Дозволені лише зображення'));
    cb(null, true);
  },
});

const router = express.Router();

router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;