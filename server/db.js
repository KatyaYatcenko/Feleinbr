import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const db = await open({
  filename: path.join(__dirname, 'feleinbr.sqlite'),
  driver: sqlite3.Database
});

await db.exec('PRAGMA foreign_keys = ON');

const userTableInfo = await db.all('PRAGMA table_info(users)');
const existingColumns = new Set(userTableInfo.map((column) => column.name));

if (userTableInfo.length > 0) {
  for (const [name, definition] of [
    ['email', 'TEXT'],
    ['reset_code', 'TEXT'],
    ['reset_code_expires_at', 'TEXT'],
  ]) {
    if (!existingColumns.has(name)) {
      await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
      existingColumns.add(name);
    }
  }
}

await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    gender TEXT NOT NULL,
    avatar_type TEXT NOT NULL,
    avatar_value TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    reset_code TEXT,
    reset_code_expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    avatar_type TEXT NOT NULL,
    avatar_value TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);



export async function ensurePrivateBohdanForUser(userId) {
  const secretDataJson = process.env.MY_PRIVATE_BOT; 
  if (!secretDataJson) return;

  try {
    const user = await db.get('SELECT email FROM users WHERE id = ?', userId);
    const botData = JSON.parse(secretDataJson);

    
    if (user && user.email === botData.ownerEmail) {
      const existing = await db.get(
        'SELECT id FROM characters WHERE owner_id = ? AND name = ?',
        userId,
        botData.name
      );

      if (!existing) {
        await db.run(
          `INSERT INTO characters (owner_id, name, description, avatar_type, avatar_value, visibility)
           VALUES (?, ?, ?, ?, ?, 'private')`,
          userId,
          botData.name,
          botData.description,
          botData.avatarType,
          botData.avatarValue
        );
        console.log('Приватного персонажа відновлено у профілі.');
      }
    }
  } catch (err) {
    console.error('Помилка відновлення персонажа:', err);
  }
}