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
  };
}

// Список персонажів: усі публічні + власні приватні
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM characters WHERE visibility = ? OR owner_id = ? ORDER BY created_at DESC')
    .all('public', req.userId);
  res.json({ characters: rows.map((c) => toPublicCharacter(c, req.userId)) });
});

router.post('/', requireAuth, (req, res) => {
  const { name, description, avatarType, avatarValue, visibility } = req.body;
  if (!name?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "Потрібні ім'я та опис персонажа" });
  }
  const vis = visibility === 'public' ? 'public' : 'private';

  const info = db
    .prepare(
      'INSERT INTO characters (owner_id, name, description, avatar_type, avatar_value, visibility) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(req.userId, name.trim(), description.trim(), avatarType || 'icon', avatarValue || 'cat', vis);

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(info.lastInsertRowid);
  res.json({ character: toPublicCharacter(character, req.userId) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Персонажа не знайдено' });
  if (character.owner_id !== req.userId) return res.status(403).json({ error: 'Це не твій персонаж' });

  db.prepare('DELETE FROM messages WHERE character_id = ?').run(character.id);
  db.prepare('DELETE FROM characters WHERE id = ?').run(character.id);
  res.json({ ok: true });
});

export default router;
