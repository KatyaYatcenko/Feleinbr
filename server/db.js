import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Якщо задано DATABASE_URL (рядок підключення до Postgres, наприклад від
// Supabase) — використовуємо його. Це справжня постійна база даних, яка
// НЕ стирається при кожному redeploy на Render чи "засинанні" безкоштовного
// сервера, на відміну від локального SQLite-файла.
// Якщо DATABASE_URL не задано — все працює як і раніше, на локальному
// SQLite-файлі (годиться для локальної розробки; на Render без платного
// диска дані там стиратимуться).
const usePostgres = Boolean(process.env.DATABASE_URL);

export let db;

if (usePostgres) {
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Наш код усюди написаний під SQLite-стиль (db.get/db.all/db.run з "?"
  // замість параметрів). Цей "перекладач" дозволяє лишити всі SQL-запити
  // в routes/*.js БЕЗ ЗМІН — сам підміняє "?" на "$1, $2..." для Postgres.
  function toPgSql(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  function flattenParams(params) {
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
  }

  // Postgres використовує інші коди помилок, ніж SQLite (23505 — це
  // "unique_violation", 23503 — "foreign_key_violation"). Підміняємо їх
  // на звичний SQLITE_CONSTRAINT, щоб increaseexisting перевірки
  // err.code === 'SQLITE_CONSTRAINT' у routes/*.js спрацьовували як і раніше.
  function normalizeError(err) {
    if (err?.code === '23505' || err?.code === '23503') {
      err.code = 'SQLITE_CONSTRAINT';
    }
    return err;
  }

  db = {
    async get(sql, ...params) {
      try {
        const res = await pool.query(toPgSql(sql), flattenParams(params));
        return res.rows[0];
      } catch (err) {
        throw normalizeError(err);
      }
    },
    async all(sql, ...params) {
      try {
        const res = await pool.query(toPgSql(sql), flattenParams(params));
        return res.rows;
      } catch (err) {
        throw normalizeError(err);
      }
    },
    async run(sql, ...params) {
      try {
        let finalSql = sql.trim();
        if (/^INSERT/i.test(finalSql) && !/RETURNING/i.test(finalSql)) {
          finalSql = finalSql.replace(/;\s*$/, '') + ' RETURNING id';
        }
        const res = await pool.query(toPgSql(finalSql), flattenParams(params));
        return {
          lastID: res.rows[0]?.id,
          changes: res.rowCount,
        };
      } catch (err) {
        throw normalizeError(err);
      }
    },
    async exec(sql) {
      await pool.query(sql);
    },
  };

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      gender TEXT NOT NULL,
      avatar_type TEXT NOT NULL,
      avatar_value TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      reset_code TEXT,
      reset_code_expires_at TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      avatar_type TEXT NOT NULL,
      avatar_value TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      character_id INTEGER NOT NULL REFERENCES characters(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL,
      content TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('База даних: Postgres (Supabase) — дані зберігаються назавжди.');
} else {
  const { open } = await import('sqlite');
  const { default: sqlite3 } = await import('sqlite3');

  // DATA_DIR дозволяє винести файл бази даних на постійний диск (Render
  // Disk, тощо), щоб персонажі й повідомлення НЕ зникали після кожного
  // redeploy чи "засинання" безкоштовного сервера. Якщо DATA_DIR не
  // задано — база лежить поруч із кодом (це нормально лише для локальної
  // розробки, на проді вона стиратиметься).
  const dataDir = process.env.DATA_DIR || __dirname;

  db = await open({
    filename: path.join(dataDir, 'feleinbr.sqlite'),
    driver: sqlite3.Database,
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

  console.log(
    'База даних: локальний SQLite-файл — на Render без платного диска дані стиратимуться при кожному redeploy. Задай DATABASE_URL (Supabase), щоб цього уникнути.'
  );
}

export async function ensurePrivatePetForUser(userId) {
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