import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import './db.js';

import authRoutes from './routes/auth.js';
import characterRoutes from './routes/characters.js';
import messageRoutes from './routes/messages.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Configure CORS: if CORS_ORIGIN is set in .env, allow only that origin,
// otherwise allow all origins (useful for local development).
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin }));
} else {
  app.use(cors());
}
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Внутрішня помилка сервера' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Фелейнбр-сервер запущено на порту ${PORT}`));
