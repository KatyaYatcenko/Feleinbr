import express from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const GENDER_LABEL = { male: 'чоловік', female: 'жінка', other: 'людина, стать не уточнена' };

function sanitizeModelReply(raw) {
  if (typeof raw !== 'string') return '';

  return raw
    .replace(/User Safety:\s*(safe|unsafe)/gi, '')
    .replace(/\(([^)]*[,;][^)]*)\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractReplyText(content) {
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || part?.content || '').join('\n').trim();
  }
  if (typeof content === 'string') return content;
  if (content?.text) return content.text;
  return '';
}

function buildContentParts(text, imageUrl, req) {
  const parts = [];
  if (text?.trim()) {
    parts.push({ type: 'text', text: text.trim() });
  }

  if (imageUrl) {
    let resolvedUrl = imageUrl;
    if (!resolvedUrl.startsWith('data:') && !/^https?:\/\//i.test(resolvedUrl)) {
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      resolvedUrl = resolvedUrl.startsWith('/') ? `${baseUrl}${resolvedUrl}` : `${baseUrl}/${resolvedUrl}`;
    }

    parts.push({ type: 'image_url', image_url: { url: resolvedUrl } });
  }

  return parts;
}

function getCharacterDescription(character) {
  const preferred = typeof character?.description === 'string' ? character.description : '';
  const fallback = typeof character?.systemPrompt === 'string' ? character.systemPrompt : '';
  const value = preferred.trim() || fallback.trim();
  return typeof value === 'string' ? value : '';
}

function buildSystemPrompt(character, user) {
  const description = getCharacterDescription(character) || 'Опис персонажа відсутній.';
  const genderLabel = GENDER_LABEL[user?.gender] || GENDER_LABEL.other;
  return `Ти — ${character?.name || 'персонаж'}. Твоя особистість: ${description}.

З ким ти спілкуєшся: користувача звати ${user?.username || 'співрозмовник'}, це ${genderLabel}.
Враховуй цю інформацію природно (напр. звертання, форми дієслів), але не згадуй її напряму без потреби.

Системне правило:
Спілкуйся ТІЛЬКИ як людина у звичайному месенджері (Telegram/WhatsApp). КАТЕГОРИЧНО ЗАБОРОНЕНО використовувати дужки, описувати дії, емоції чи жест у третій особі (наприклад, (Богдан посміхається), *відповідає* тощо). Відповідай виключно прямим текстом від першої особи, короткими побутовими реченнями, як у реальному чаті.

ВИМОГА ДО МОВИ: Відповідай ВИКЛЮЧНО тією мовою, якою написаний опис персонажа (system prompt / character description). Якщо опис написаний українською — відповідай тільки українською. Категорично заборонено переходити на інші мови чи використовувати іноземний сленг, якщо він відсутній в описі.
LANGUAGE RULE: Detect the language of the character description below. Respond ONLY in that language. If the description is in Ukrainian, respond strictly in clean, natural Ukrainian. Do not mix languages or generate random words.

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

  // Берем історію попередніх повідомлень з бази ДO збереження нового (ліміт до 20)
  const rawHistory = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id DESC LIMIT 20',
    character.id,
    req.userId
  );

  // Зберігає нове повідомлення користувача в БД
  await db.run(
    'INSERT INTO messages (character_id, user_id, role, content, image_url) VALUES (?, ?, ?, ?, ?)',
    character.id,
    req.userId,
    'user',
    content || '',
    imageUrl || null
  );

  // Формує масив історії для OpenRouter (від старих до нових)
  const formattedHistory = [];
  for (const msg of rawHistory.reverse()) {
    const parts = await buildContentParts(msg.content || '', msg.image_url, req);
    formattedHistory.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: parts.length ? parts : [{ type: 'text', text: msg.content || '' }],
    });
  }

  // Формуємо нове повідомлення користувача
  const currentUserContent = await buildContentParts(content || '', imageUrl, req);
  const characterPrompt = buildSystemPrompt(character, user);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'system', content: characterPrompt },
          ...formattedHistory,
          { role: 'user', content: currentUserContent.length ? currentUserContent : [{ type: 'text', text: content || '' }] },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errText,
      });
      if (response.status === 429) {
        return res.status(429).json({ error: 'Зачекайте кілька секунд' });
      }
      return res.status(502).json({ error: 'Помилка звернення до OpenRouter' });
    }

    const data = await response.json();
    const rawReply = extractReplyText(data?.choices?.[0]?.message?.content);
    const reply = sanitizeModelReply(rawReply) || 'Вибач, не вдалося сформувати відповідь.';

    // Зберігаємо відповідь персонажа в БД
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
    res.status(502).json({ error: 'Помилка звернення до OpenRouter' });
  }
});

router.delete('/:characterId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  await db.run('DELETE FROM messages WHERE character_id = ? AND user_id = ?', character.id, req.userId);
  res.json({ ok: true });
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
