import express from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const GENDER_LABEL = { male: 'хлопець', female: 'дівчина', other: 'людина' };

function sanitizeModelReply(raw) {
  if (typeof raw !== 'string') return '';

  return raw
    .replace(/User Safety:\s*(safe|unsafe).*/gi, '')
    .replace(/Response Safety:.*/gi, '')
    .replace(/\*+/g, '') 
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

    parts.push({ 
      type: 'image_url', 
      image_url: { url: resolvedUrl } 
    });
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
  const description = getCharacterDescription(character) || 'Дружній, живий та емоційний співрозмовник.';
  const genderLabel = GENDER_LABEL[user?.gender] || GENDER_LABEL.other;
  
  return `Ти — ${character?.name || 'персонаж'}. 
Твоя особистість, харизма та характер:
${description}

Твій співрозмовник: ${user?.username || 'друг'} (${genderLabel}).

СУВОРІ ПРАВИЛА СПІЛКУВАННЯ:
1. ВІДПОВІДАЙ ВИКЛЮЧНО УКРАЇНСЬКОЮ МОВОЮ! Жодних англійських слів, кальки чи залишків перекладу (типу "yours", "looks good" тощо).
2. Пиши як реальна людина в месенджері (Telegram/Instagram) — коротко, життєво, з емоціями.
3. Якщо користувач надсилає ФОТО — роздивись його і природно прокоментуй українською мовою те, що на ньому бачиш (одяг, лук, вайб, локацію).
4. НІКОЛИ не описуй свої дії в дужках чи зірочках (НЕ пиши *посміхається* чи (підмигує)). Тільки пряма мова.`;
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

  const rawHistory = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id DESC LIMIT 14',
    character.id,
    req.userId
  );

  await db.run(
    'INSERT INTO messages (character_id, user_id, role, content, image_url) VALUES (?, ?, ?, ?, ?)',
    character.id,
    req.userId,
    'user',
    content || '',
    imageUrl || null
  );

  const formattedHistory = [];
  for (const msg of rawHistory.reverse()) {
    const parts = await buildContentParts(msg.content || '', msg.image_url, req);
    formattedHistory.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: parts.length ? parts : [{ type: 'text', text: msg.content || '' }],
    });
  }

  const currentUserContent = await buildContentParts(content || '', imageUrl, req);
  const characterPrompt = buildSystemPrompt(character, user);
  console.log('--- ЩО БАЧИТЬ МОДЕЛЬ ---', JSON.stringify(currentUserContent, null, 2));

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
        safety_settings: [
          { category: 'HARM_CATEGORY_SEXUAL', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', { status: response.status, body: errText });
      return res.status(502).json({ error: 'Помилка генерації відповіді' });
    }

    const data = await response.json();
    const rawReply = extractReplyText(data?.choices?.[0]?.message?.content);
    let reply = sanitizeModelReply(rawReply);

    if (!reply || reply.includes('unsafe Safety Categories')) {
      reply = 'Хмм, щось я замріятися і пропустив твоє повідомлення... Напишеш ще раз?';
    }

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
    res.status(502).json({ error: 'Помилка зєднання з сервером' });
  }
});

router.delete('/:characterId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  await db.run('DELETE FROM messages WHERE character_id = ? AND user_id = ?', character.id, req.userId);
  res.json({ ok: true });
});

export default router;