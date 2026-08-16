import express from 'express';
import client from '../config/cassandra.js';

const router = express.Router();

// Route pour récupérer / rechercher des utilisateurs
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    
    // Récupérer tous les utilisateurs de la table
    const query = 'SELECT user_id, username, email FROM chat_app_v2.users';
    const result = await client.execute(query);
    
    // Filtrer en mémoire pour supporter la recherche partielle (ex: "Nasa" trouve "Naivo")
    const users = result.rows.filter(user => 
      user.username && user.username.toLowerCase().includes(search.toLowerCase())
    );

    res.json(users);
  } catch (err) {
    console.error('Erreur récupération utilisateurs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;