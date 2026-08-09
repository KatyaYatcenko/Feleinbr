import express from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';

const router = express.Router();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const generativeModel = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

const GENDER_LABEL = { male: 'чоловік', female: 'жінка', other: 'людина, стать не уточнена' };

function buildSystemPrompt(character, user) {
  const genderLabel = GENDER_LABEL[user?.gender] || GENDER_LABEL.other;
  return `Ти — ${character.name}. Твоя особистість: ${character.description}.

З ким ти спілкуєшся: користувача звати ${user?.username || 'співрозмовник'}, це ${genderLabel}.
Враховуй цю інформацію природно (напр. звертання, форми дієслів), але не згадуй її напряму без потреби.

ПРАВИЛА СПІЛКУВАННЯ:
1. Ти спілкуєшся як реальна людина в месенджері — коротко, природно, без зайвого пафосу.
2. НІКОЛИ не використовуй опис дій у зірочках (*посміхається*) чи в дужках (сміється). Тільки чисті репліки, як у звичайному чаті.
3. Не описуй свої емоції чи жести текстом — передавай їх через тон і слова, а не ремарки.
4. Відповідай природною довжиною — не пиши романи без потреби, іноді достатньо одного речення.
5. Тримай характер послідовним протягом усієї розмови.
6. Якщо співрозмовник пише неформально — відповідай так само неформально.`;
}

async function getCharacterOrFail(characterId, userId, res) {
  const character = await db.get('SELECT * FROM characters WHERE id = ?', characterId);
  if (!character) {
    res.status(404).json({ error: 'Персонажа не знайдено' });
    return null;
  }
  if (character.visibility === 'private' && character.owner_id !== userId) {
    res.status(403).json({ error: 'Цей персонаж приватний' });
    return null;
  }
  return character;
}

// Історія діалогу конкретного користувача з конкретним персонажем
router.get('/:characterId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  const rows = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC',
    character.id,
    req.userId
  );

  res.json({
    messages: rows.map((m) => ({ id: m.id, role: m.role, content: m.content, imageUrl: m.image_url })),
  });
});

router.post('/:characterId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  const { content, imageUrl } = req.body;
  if (!content?.trim() && !imageUrl) {
    return res.status(400).json({ error: 'Порожнє повідомлення' });
  }

  const user = await db.get('SELECT * FROM users WHERE id = ?', req.userId);

  await db.run(
    'INSERT INTO messages (character_id, user_id, role, content, image_url) VALUES (?, ?, ?, ?, ?)',
    character.id,
    req.userId,
    'user',
    content || '',
    imageUrl || null
  );

  const history = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id DESC LIMIT 10',
    character.id,
    req.userId
  );

  const fullSystemPrompt = buildSystemPrompt(character, user);
  const formattedHistory = history
    .reverse()
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      parts: [{ text: msg.content || '' }],
    }));

  try {
    const result = await generativeModel.generateContent({
      systemInstruction: fullSystemPrompt,
      contents: formattedHistory,
    });

    const reply = result.response?.text?.().trim() || 'Вибач, не вдалося сформувати відповідь.';

    await db.run(
      'INSERT INTO messages (character_id, user_id, role, content) VALUES (?, ?, ?, ?)',
      character.id,
      req.userId,
      'assistant',
      reply
    );

    res.json({ reply });
  } catch (e) {
    console.error('Message send error:', e);
    if (e instanceof GoogleGenerativeAIFetchError && e.status === 429) {
      return res.status(429).json({ error: 'Зачекайте кілька секунд' });
    }
    if (e?.status === 429) {
      return res.status(429).json({ error: 'Зачекайте кілька секунд' });
    }
    res.status(502).json({ error: 'Помилка звернення до моделі' });
  }
});

router.delete('/:characterId/:messageId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  const message = await db.get(
    'SELECT * FROM messages WHERE id = ? AND character_id = ? AND user_id = ?',
    req.params.messageId,
    character.id,
    req.userId
  );

  if (!message) {
    return res.status(404).json({ error: 'Повідомлення не знайдено' });
  }

  await db.run('DELETE FROM messages WHERE id = ?', message.id);

  const rows = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC',
    character.id,
    req.userId
  );

  res.json({ messages: rows.map((m) => ({ id: m.id, role: m.role, content: m.content, imageUrl: m.image_url })) });
});

router.post('/:characterId/:messageId/rewind', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  const message = await db.get(
    'SELECT * FROM messages WHERE id = ? AND character_id = ? AND user_id = ?',
    req.params.messageId,
    character.id,
    req.userId
  );

  if (!message) {
    return res.status(404).json({ error: 'Повідомлення не знайдено' });
  }

  await db.run(
    'DELETE FROM messages WHERE character_id = ? AND user_id = ? AND id > ?',
    character.id,
    req.userId,
    message.id
  );

  const rows = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC',
    character.id,
    req.userId
  );

  res.json({ messages: rows.map((m) => ({ id: m.id, role: m.role, content: m.content, imageUrl: m.image_url })) });
});

export default router;
