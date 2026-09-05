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
//
// ВАЖЛИВО: тут навмисно НЕ використовується пакет @supabase/supabase-js —
// він під капотом ще й підіймає Realtime-клієнт (WebSocket), який тут
// узагалі не потрібен (треба лише Storage), а на версії Node, яку
// Render використовує за замовчуванням, це валило сервер з помилкою
// "Node.js detected but native WebSocket not found". Замість пакета —
// звичайні HTTP-запити напряму до Storage REST API Supabase, без зайвих
// залежностей і без цього бага.
const useSupabaseStorage = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!useSupabaseStorage && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

async function uploadToSupabaseStorage(filename, buffer, contentType) {
  const uploadUrl = `${process.env.SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      // Нові ключі Supabase (sb_secret_...) — це НЕ JWT, тому їх треба
      // класти саме в заголовок apikey, а не Authorization: Bearer
      // (звідти й помилка "Invalid Compact JWS" — сервер намагався
      // розпарсити ключ як JWT-токен). Authorization лишаємо так само —
      // Supabase приймає його, якщо збігається зі значенням apikey.
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: buffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase Storage: ${res.status} ${errText}`);
  }

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
}

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
      const url = await uploadToSupabaseStorage(
        filename,
        req.file.buffer,
        req.file.mimetype
      );
      return res.json({ url });
    }

    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
    return res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Помилка завантаження фото:', err);
    return res.status(500).json({ error: 'Не вдалося завантажити фото' });
  }
});

export default router;