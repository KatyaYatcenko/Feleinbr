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

// Якщо задано SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY — фото йдуть у
// Supabase Storage (справжній постійний диск, безкоштовно, не залежить
// від Render). Якщо ні — як і раніше, пишемо на локальний диск сервера
// (працює, але без платного Render Disk НЕ переживає redeploy).
const useSupabaseStorage = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

let supabase = null;
if (useSupabaseStorage) {
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} else if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

// memoryStorage — тримаємо файл у пам'яті (не на диску одразу), бо він
// тепер може піти або в Supabase Storage, або на локальний диск.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Дозволені лише зображення'));
    cb(null, true);
  },
});

const router = express.Router();

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' });

  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = crypto.randomBytes(16).toString('hex') + ext;

  try {
    if (useSupabaseStorage) {
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filename);

      return res.json({ url: data.publicUrl });
    }

    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
    return res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Помилка завантаження фото:', err);
    return res.status(500).json({ error: 'Не вдалося завантажити фото' });
  }
});

export default router;