import express from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

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

function getCharacterOrFail(characterId, userId, res) {
  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
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
router.get('/:characterId', requireAuth, (req, res) => {
  const character = getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  const rows = db
    .prepare('SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC')
    .all(character.id, req.userId);

  res.json({
    messages: rows.map((m) => ({ role: m.role, content: m.content, imageUrl: m.image_url })),
  });
});

router.post('/:characterId', requireAuth, async (req, res) => {
  const character = getCharacterOrFail(req.params.characterId, req.userId, res);
  if (!character) return;

  const { content, imageUrl } = req.body;
  if (!content?.trim() && !imageUrl) {
    return res.status(400).json({ error: 'Порожнє повідомлення' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

  db.prepare('INSERT INTO messages (character_id, user_id, role, content, image_url) VALUES (?, ?, ?, ?, ?)').run(
    character.id, req.userId, 'user', content || '', imageUrl || null
  );

  const history = db
    .prepare('SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC')
    .all(character.id, req.userId);

  const llmMessages = history.map((m) => ({
    role: m.role,
    content: m.image_url ? `${m.content || ''}\n[користувач надіслав фото]`.trim() : m.content || '',
  }));

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://feleinbr.local',
        'X-Title': 'Фелейнбр',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite:free',
        messages: [{ role: 'system', content: buildSystemPrompt(character, user) }, ...llmMessages],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      return res.status(502).json({ error: 'Помилка звернення до моделі' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Вибач, не вдалося сформувати відповідь.';

    db.prepare('INSERT INTO messages (character_id, user_id, role, content) VALUES (?, ?, ?, ?)').run(
      character.id, req.userId, 'assistant', reply
    );

    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

export default router;
