import express from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const GENDER_LABEL = {
  male: 'хлопець',
  female: 'дівчина',
  other: 'людина',
};

function sanitizeModelReply(raw) {
  if (typeof raw !== 'string') return '';

  return raw
    .replace(/User Safety:\s*\*?\*?(safe|unsafe)\*?\*?.*/gi, '')
    .replace(/Response Safety:.*/gi, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\([^)]*\)/g, '')
    .replace(/\*+/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractReplyText(content) {
  if (Array.isArray(content)) {
    return content
      .map((part) => part?.text || part?.content || '')
      .join('\n')
      .trim();
  }

  if (typeof content === 'string') return content;
  if (content?.text) return content.text;

  return '';
}

function buildContentParts(text, imageUrl, req) {
  const parts = [];

  if (text?.trim()) {
    parts.push({
      type: 'text',
      text: text.trim(),
    });
  }

  if (imageUrl) {
    let resolvedUrl = imageUrl;

    if (
      !resolvedUrl.startsWith('data:') &&
      !/^https?:\/\//i.test(resolvedUrl)
    ) {
      const baseUrl =
        process.env.PUBLIC_BASE_URL ||
        `${req.protocol}://${req.get('host')}`;

      resolvedUrl = resolvedUrl.startsWith('/')
        ? `${baseUrl}${resolvedUrl}`
        : `${baseUrl}/${resolvedUrl}`;
    }

    parts.push({
      type: 'image_url',
      image_url: {
        url: resolvedUrl,
      },
    });
  }

  return parts;
}

function getCharacterDescription(character) {
  const preferred =
    typeof character?.description === 'string'
      ? character.description
      : '';

  const fallback =
    typeof character?.systemPrompt === 'string'
      ? character.systemPrompt
      : '';

  return preferred.trim() || fallback.trim();
}

function buildSystemPrompt(character, user) {
  const description =
    getCharacterDescription(character) || 'Дружній співрозмовник.';

  const genderLabel =
    GENDER_LABEL[user?.gender] || GENDER_LABEL.other;

  return `Ти — ${character?.name || 'персонаж'}.

Опис особистості:
${description}

Твій співрозмовник: ${user?.username || 'користувач'} (${genderLabel}).

Це звичайний особистий чат. Відповідай як конкретна людина з описаним характером, а не як AI-помічник.

Правила стилю спілкування:

- Це звичайний живий чат, а не рольова сцена.
- Відповідай природно і коротко.
- Не вигадуй події, яких не було в діалозі.
- Не перетворюй звичайні повідомлення на флірт або сексуальний контекст без явної причини.
- Не пояснюй свої дії, думки, жести, міміку чи стан.
- Не використовуй художню прозу.
- Не використовуй формулювання на кшталт "якщо хочеш", "ти точно готова?", "я вже біжу", якщо вони не випливають безпосередньо з контексту.
- Не намагайся бути милим, кокетливим або грайливим у кожній відповіді.
- Якщо повідомлення коротке, відповідь теж зазвичай має бути короткою.
- Якщо користувач пише "привіт" — відповідай як людина в чаті, а не створюй сцену.
- Якщо користувач називає тебе по імені — не роби вигляд, що це загадка або привід для драматичної реакції.
- Говори українською розмовною мовою.
- Не використовуй російські, англійські або дивні машинні конструкції, якщо вони не є частиною природної мови персонажа.
- Не вигадуй слова та граматичні конструкції.
- Не вставляй емодзі без причини.`;
}

async function getCharacterOrFail(characterId, userId, res) {
  const character = await db.get(
    'SELECT * FROM characters WHERE id = ?',
    characterId
  );

  if (!character) {
    res.status(404).json({
      error: 'Персонажа не знайдено',
    });
    return null;
  }

  if (
    character.visibility === 'private' &&
    character.owner_id !== userId
  ) {
    res.status(403).json({
      error: 'Цей персонаж приватний',
    });
    return null;
  }

  return character;
}

router.get('/:characterId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(
    req.params.characterId,
    req.userId,
    res
  );

  if (!character) return;

  const rows = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC',
    character.id,
    req.userId
  );

  res.json({
    messages: rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      imageUrl: m.image_url,
    })),
  });
});

router.post('/:characterId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(
    req.params.characterId,
    req.userId,
    res
  );

  if (!character) return;

  const { content, imageUrl } = req.body;

  if (!content?.trim() && !imageUrl) {
    return res.status(400).json({
      error: 'Порожнє повідомлення',
    });
  }

  const user = await db.get(
    'SELECT * FROM users WHERE id = ?',
    req.userId
  );

  const rawHistory = await db.all(
    'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id DESC LIMIT 10',
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
    const parts = buildContentParts(
      msg.content || '',
      msg.image_url,
      req
    );

    formattedHistory.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: parts.length
        ? parts
        : [
            {
              type: 'text',
              text: msg.content || '',
            },
          ],
    });
  }

  const currentUserContent = buildContentParts(
    content || '',
    imageUrl,
    req
  );

  const characterPrompt = buildSystemPrompt(character, user);

  // Список усіх доступних AI-сервісів
  const providers = [
    {
      name: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
    },
    {
      name: 'Mistral AI',
      url: 'https://api.mistral.ai/v1/chat/completions',
      key: process.env.MISTRAL_API_KEY,
      model: 'mistral-small-latest', // або 'mistral-medium-latest', 'open-mixtral-8x7b'
    },
    {
      name: 'Gemini (OpenAI-compatible)',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: process.env.GEMINI_API_KEY,
      model: 'gemini-2.0-flash',
    },
    {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
    },
    {
      name: 'DeepSeek',
      url: 'https://api.deepseek.com/chat/completions',
      key: process.env.DEEPSEEK_API_KEY,
      model: 'deepseek-chat',
    },
  ];

  const startTime = Date.now();
  let response = null;
  let usedProvider = null;

  // Автоматичне переключення між сервісами
  for (const provider of providers) {
    if (!provider.key) continue;

    try {
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: 'system',
              content: characterPrompt,
            },
            ...formattedHistory,
            {
              role: 'user',
              content: currentUserContent.length
                ? currentUserContent
                : [
                    {
                      type: 'text',
                      text: content || '',
                    },
                  ],
            },
          ],
          max_tokens: 250,
        }),
      });

      if (res.ok) {
        response = res;
        usedProvider = provider.name;
        break;
      }

      const errText = await res.text();
      console.warn(`Провайдер ${provider.name} дав помилку ${res.status}:`, errText);
    } catch (err) {
      console.error(`Помилка запиту до ${provider.name}:`, err);
    }
  }

  const elapsed = Date.now() - startTime;

  if (!response) {
    console.error(`Усі AI-сервіси повернули помилку або не мають ключів. Затрачено ${elapsed} мс.`);
    return res.status(502).json({
      error: 'Усі AI-сервіси наразі недоступні або вичерпано ліміти.',
    });
  }

  try {
    const data = await response.json();

    console.log(
      `Відповідь успішно отримано через ${usedProvider} за ${elapsed} мс. Модель: ${data?.model || 'невідома'}`
    );

    const rawReply = extractReplyText(
      data?.choices?.[0]?.message?.content
    );

    const reply = sanitizeModelReply(rawReply);

    if (!reply) {
      console.error('Порожня відповідь моделі:', {
        rawReply,
        content: data?.choices?.[0]?.message?.content,
        data,
      });

      return res.status(502).json({
        error: 'Модель повернула порожню відповідь',
      });
    }

    await db.run(
      'INSERT INTO messages (character_id, user_id, role, content, image_url) VALUES (?, ?, ?, ?, ?)',
      character.id,
      req.userId,
      'assistant',
      reply,
      null
    );

    return res.json({
      reply,
    });
  } catch (error) {
    console.error(`Помилка обробки відповіді від ${usedProvider}:`, error);

    return res.status(500).json({
      error: 'Не вдалося обробити відповідь від моделі',
    });
  }
});

router.delete('/:characterId/:messageId', requireAuth, async (req, res) => {
  const { characterId, messageId } = req.params;

  try {
    const character = await getCharacterOrFail(
      characterId,
      req.userId,
      res
    );

    if (!character) return;

    const message = await db.get(
      'SELECT * FROM messages WHERE id = ? AND character_id = ? AND user_id = ?',
      messageId,
      characterId,
      req.userId
    );

    if (!message) {
      return res.status(404).json({
        error: 'Повідомлення не знайдено',
      });
    }

    await db.run(
      'DELETE FROM messages WHERE id = ? AND character_id = ? AND user_id = ?',
      messageId,
      characterId,
      req.userId
    );

    const rows = await db.all(
      'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC',
      characterId,
      req.userId
    );

    res.json({
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        imageUrl: m.image_url,
      })),
    });
  } catch (err) {
    console.error('Delete message error:', err);

    res.status(500).json({
      error: 'Помилка видалення повідомлення',
    });
  }
});

router.post('/:characterId/:messageId/rewind', requireAuth, async (req, res) => {
  const { characterId, messageId } = req.params;

  try {
    const character = await getCharacterOrFail(
      characterId,
      req.userId,
      res
    );

    if (!character) return;

    const message = await db.get(
      'SELECT * FROM messages WHERE id = ? AND character_id = ? AND user_id = ?',
      messageId,
      characterId,
      req.userId
    );

    if (!message) {
      return res.status(404).json({
        error: 'Повідомлення не знайдено',
      });
    }

    await db.run(
      'DELETE FROM messages WHERE character_id = ? AND user_id = ? AND id >= ?',
      characterId,
      req.userId,
      messageId
    );

    const rows = await db.all(
      'SELECT * FROM messages WHERE character_id = ? AND user_id = ? ORDER BY id ASC',
      characterId,
      req.userId
    );

    res.json({
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        imageUrl: m.image_url,
      })),
    });
  } catch (err) {
    console.error('Rewind message error:', err);

    res.status(500).json({
      error: 'Помилка перемотування повідомлення',
    });
  }
});

router.delete('/:characterId', requireAuth, async (req, res) => {
  const character = await getCharacterOrFail(
    req.params.characterId,
    req.userId,
    res
  );

  if (!character) return;

  await db.run(
    'DELETE FROM messages WHERE character_id = ? AND user_id = ?',
    character.id,
    req.userId
  );

  res.json({
    ok: true,
  });
});

export default router;