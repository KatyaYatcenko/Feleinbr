import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function toPublicUser(u) {
  return { id: u.id, username: u.username, gender: u.gender, avatarType: u.avatar_type, avatarValue: u.avatar_value };
}

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', async (req, res) => {
  const { username, password, gender, avatarType, avatarValue } = req.body;
  const trimmedUsername = (username || '').trim();

  if (!trimmedUsername || !password || password.length < 4) {
    return res.status(400).json({ error: "Потрібні ім'я користувача та пароль (мінімум 4 символи)" });
  }

  try {
    const existing = await db.get('SELECT id FROM users WHERE username = ?', trimmedUsername);
    if (existing) return res.status(409).json({ error: "Це ім'я користувача вже зайняте" });

    const hash = await bcrypt.hash(password, 10);
    const info = await db.run(
      'INSERT INTO users (username, gender, avatar_type, avatar_value, password_hash) VALUES (?, ?, ?, ?, ?)',
      trimmedUsername, gender || 'other', avatarType || 'icon', avatarValue || 'sparkles', hash
    );

    if (!info || !info.lastID) {
      console.error('Registration error: insert returned no lastID', info);
      return res.status(500).json({ error: 'Не вдалося створити користувача' });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', info.lastID);
    if (!user) {
      console.error('Registration error: created user not found', info.lastID);
      return res.status(500).json({ error: 'Не вдалося створити користувача' });
    }

    res.json({ token: makeToken(user.id), user: toPublicUser(user) });
  } catch (err) {
    console.error('Registration error:', err);
    if (err?.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: "Це ім'я користувача вже зайняте" });
    }
    res.status(500).json({ error: 'Помилка при реєстрації' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', (username || '').trim());
    if (!user) return res.status(401).json({ error: "Невірне ім'я користувача або пароль" });

    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: "Невірне ім'я користувача або пароль" });

    res.json({ token: makeToken(user.id), user: toPublicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Помилка при вході' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.userId);
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Помилка отримання даних користувача' });
  }
});

export default router;
