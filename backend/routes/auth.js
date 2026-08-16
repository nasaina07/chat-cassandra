import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { types } from 'cassandra-driver';
import client from '../config/cassandra.js';

const router = express.Router();
const JWT_SECRET = 'votre_cle_secrete';

// Inscription
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await client.execute('SELECT email FROM users_by_email WHERE email = ?', [email]);
    if (existing.rowLength > 0) return res.status(400).json({ error: 'Email déjà utilisé' });

    const userId = types.Uuid.random();
    const hash = await bcrypt.hash(password, 10);
    const now = new Date();

    const queryUser = 'INSERT INTO users (user_id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)';
    const queryEmail = 'INSERT INTO users_by_email (email, user_id, username, password_hash) VALUES (?, ?, ?, ?)';

    await client.batch([
      { query: queryUser, params: [userId, username, email, hash, now] },
      { query: queryEmail, params: [email, userId, username, hash] }
    ], { prepare: true });

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: userId, username, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await client.execute('SELECT * FROM users_by_email WHERE email = ?', [email], { prepare: true });
    if (result.rowLength === 0) return res.status(400).json({ error: 'Utilisateur introuvable' });

    const user = result.first();
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Mot de passe incorrect' });

    const token = jwt.sign({ userId: user.user_id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.user_id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;