import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { db, ensurePrivatePetForUser } from '../db.js';

const router = express.Router();

function toPublicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    gender: u.gender,
    avatarType: u.avatar_type,
    avatarValue: u.avatar_value,
    avatar: u.avatar_value,
  };
}

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function makeResetCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendResetEmail(email, code) {
  // ВАЖЛИВО: з вересня 2025 безкоштовні сервіси Render повністю блокують
  // вихідні SMTP-порти (25, 465, 587) на мережевому рівні — це офіційна
  // політика проти спаму (render.com/docs/free), і жодні налаштування
  // коду/nodemailer це не обійдуть. Тому лист відправляємо через звичайний
  // HTTPS-запит до Brevo (https://www.brevo.com) — порт 443 не блокується.
  // Якщо BREVO_API_KEY не задано — падаємо назад на SMTP (годиться для
  // локальної розробки на своєму комп'ютері, де SMTP не заблокований).
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@feleinbr.app',
            name: 'Фелейнбр',
          },
          to: [{ email }],
          subject: 'Код для відновлення пароля — Фелейнбр',
          htmlContent: `<p>Твій код для відновлення пароля: <b style="font-size:20px">${code}</b></p><p>Код дійсний 10 хвилин.</p>`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Brevo API: ${res.status} ${errText}`);
      }

      return true;
    } catch (err) {
      console.error('Send reset email error (Brevo):', err);
      return false;
    }
  }

  try {
    const nodemailer = await import('nodemailer').catch(() => null);
    if (!nodemailer || !process.env.SMTP_HOST) {
      console.log(`[password-reset] ${email}: ${code}`);
      return true;
    }

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      family: 4,
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@feleinbr.local',
      to: email,
      subject: 'Код для відновлення пароля',
      text: `Ваш код для відновлення пароля: ${code}\nДійсний 10 хвилин.`,
    });
    return true;
  } catch (err) {
    console.error('Send reset email error (SMTP):', err);
    return false;
  }
}

router.post('/register', async (req, res) => {
  const { username, password, gender, avatarType, avatarValue, avatar, email } = req.body;
  const trimmedUsername = (username || '').trim();

  if (!trimmedUsername || !password || password.length < 4) {
    return res.status(400).json({ error: "Потрібні ім'я користувача та пароль (мінімум 4 символи)" });
  }

  try {
    const existing = await db.get('SELECT id FROM users WHERE username = ?', trimmedUsername);
    if (existing) return res.status(409).json({ error: "Це ім'я користувача вже зайняте" });

    const hash = await bcrypt.hash(password, 10);
    const resolvedAvatarValue = avatarValue || avatar || 'sparkles';
    const info = await db.run(
      'INSERT INTO users (username, email, gender, avatar_type, avatar_value, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      trimmedUsername,
      (email || '').trim().toLowerCase() || null,
      gender || 'other',
      avatarType || 'icon',
      resolvedAvatarValue,
      hash
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
    await ensurePrivatePetForUser(user.id);
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

    await ensurePrivatePetForUser(user.id);
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

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { username, gender, avatarType, avatarValue, email } = req.body;

    await db.run(
      `UPDATE users 
       SET username = COALESCE(?, username),
           gender = COALESCE(?, gender),
           avatar_type = COALESCE(?, avatar_type),
           avatar_value = COALESCE(?, avatar_value),
           email = COALESCE(?, email)
       WHERE id = ?`,
      username ? username.trim() : null,
      gender || null,
      avatarType || null,
      avatarValue || null,
      email ? email.trim().toLowerCase() : null,
      req.userId
    );

    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', req.userId);

    return res.json({ user: toPublicUser(updatedUser) });
  } catch (err) {
    console.error('Update profile error:', err);
    if (err?.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: "Це ім'я користувача або email вже використовується" });
    }
    return res.status(500).json({ error: 'Помилка оновлення профілю' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Потрібен email' });
  }

  try {
    const user = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (user) {
      const code = makeResetCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await db.run('UPDATE users SET reset_code = ?, reset_code_expires_at = ? WHERE id = ?', code, expiresAt, user.id);
      await sendResetEmail(email, code);
    }

    return res.json({ ok: true, message: 'Якщо email зареєстровано, ми надіслали код відновлення.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Не вдалося відправити код відновлення' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, code, password } = req.body;
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (!trimmedEmail || !code || !password || password.length < 4) {
    return res.status(400).json({ error: 'Невірні дані для відновлення пароля' });
  }

  try {
    const user = await db.get(
      'SELECT * FROM users WHERE email = ? AND reset_code = ?',
      trimmedEmail,
      code
    );

    if (!user) {
      return res.status(400).json({ error: 'Невірний код або email' });
    }

    if (!user.reset_code_expires_at || new Date(user.reset_code_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Код відновлення прострочений' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.run(
      'UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?',
      hash,
      user.id
    );

    res.json({ ok: true, message: 'Пароль оновлено' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Не вдалося оновити пароль' });
  }
});

export default router;