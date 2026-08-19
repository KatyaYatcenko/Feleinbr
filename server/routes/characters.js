import express from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function toPublicCharacter(c, userId) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    avatarType: c.avatar_type,
    avatarValue: c.avatar_value,
    visibility: c.visibility,
    isOwner: c.owner_id === userId,
    lastMessage: c.last_message || null,
  };
}

// Список персонажів: усі публічні + власні приватні
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT c.*, (
         SELECT content FROM messages
         WHERE character_id = c.id AND user_id = ?
         ORDER BY id DESC LIMIT 1
       ) AS last_message
       FROM characters c
       WHERE visibility = ? OR owner_id = ?
       ORDER BY c.created_at DESC`,
      req.userId,
      'public',
      req.userId
    );
    res.json({ characters: rows.map((c) => toPublicCharacter(c, req.userId)) });
  } catch (err) {
    console.error('Get characters error:', err);
    res.status(500).json({ error: 'Помилка отримання персонажів' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, description, avatarType, avatarValue, visibility } = req.body;
  if (!name?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "Потрібні ім'я та опис персонажа" });
  }

  try {
    const character = await db.get('SELECT * FROM characters WHERE id = ?', req.params.id);
    if (!character) return res.status(404).json({ error: 'Персонажа не знайдено' });
    if (character.owner_id !== req.userId) return res.status(403).json({ error: 'Це не твій персонаж' });

    const vis = visibility === 'public' ? 'public' : 'private';
    await db.run(
      'UPDATE characters SET name = ?, description = ?, avatar_type = ?, avatar_value = ?, visibility = ? WHERE id = ?',
      name.trim(),
      description.trim(),
      avatarType || character.avatar_type,
      avatarValue || character.avatar_value,
      vis,
      req.params.id
    );

    const updated = await db.get('SELECT * FROM characters WHERE id = ?', req.params.id);
    res.json({ character: toPublicCharacter(updated, req.userId) });
  } catch (err) {
    console.error('Update character error:', err);
    if (err?.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ error: 'Неправильні дані персонажа' });
    res.status(500).json({ error: 'Помилка оновлення персонажа' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { name, description, avatarType, avatarValue, visibility } = req.body;
  if (!name?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "Потрібні ім'я та опис персонажа" });
  }

  try {
    const character = await db.get('SELECT * FROM characters WHERE id = ?', req.params.id);
    if (!character) return res.status(404).json({ error: 'Персонажа не знайдено' });
    if (character.owner_id !== req.userId) return res.status(403).json({ error: 'Це не твій персонаж' });

    const vis = visibility === 'public' ? 'public' : 'private';
    await db.run(
      'UPDATE characters SET name = ?, description = ?, avatar_type = ?, avatar_value = ?, visibility = ? WHERE id = ?',
      name.trim(),
      description.trim(),
      avatarType || character.avatar_type,
      avatarValue || character.avatar_value,
      vis,
      req.params.id
    );

    const updated = await db.get('SELECT * FROM characters WHERE id = ?', req.params.id);
    res.json({ character: toPublicCharacter(updated, req.userId) });
  } catch (err) {
    console.error('Update character error:', err);
    if (err?.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ error: 'Неправильні дані персонажа' });
    res.status(500).json({ error: 'Помилка оновлення персонажа' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, description, avatarType, avatarValue, visibility } = req.body;
  if (!name?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "Потрібні ім'я та опис персонажа" });
  }
  const vis = visibility === 'public' ? 'public' : 'private';

  try {
    const info = await db.run(
      'INSERT INTO characters (owner_id, name, description, avatar_type, avatar_value, visibility) VALUES (?, ?, ?, ?, ?, ?)',
      req.userId,
      name.trim(),
      description.trim(),
      avatarType || 'icon',
      avatarValue || 'cat',
      vis
    );

    const id = info?.lastID || info?.lastInsertRowid;
    const character = await db.get('SELECT * FROM characters WHERE id = ?', id);
    res.json({ character: toPublicCharacter(character, req.userId) });
  } catch (err) {
    console.error('Create character error:', err);
    if (err?.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ error: 'Неправильні дані персонажа' });
    res.status(500).json({ error: 'Помилка при створенні персонажа' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const character = await db.get('SELECT * FROM characters WHERE id = ?', req.params.id);
    if (!character) return res.status(404).json({ error: 'Персонажа не знайдено' });
    if (character.owner_id !== req.userId) return res.status(403).json({ error: 'Це не твій персонаж' });

    await db.run('DELETE FROM messages WHERE character_id = ?', character.id);
    await db.run('DELETE FROM characters WHERE id = ?', character.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete character error:', err);
    res.status(500).json({ error: 'Помилка при видаленні персонажа' });
  }
});

export default router;
