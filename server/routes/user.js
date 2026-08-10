// PUT /api/auth/email або /api/user/email
router.put('/email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email обов’язковий' });
    }

    // Оновлює email у базі SQLite для поточного користувача
    const stmt = db.prepare('UPDATE users SET email = ? WHERE id = ?');
    stmt.run(email, req.user.id);

    return res.json({ success: true, email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Помилка сервера при оновленні email' });
  }
});