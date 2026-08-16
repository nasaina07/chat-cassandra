import express from 'express';
import client from '../config/cassandra.js';
import { v4 as uuidv4 } from 'uuid';
import cassandra from 'cassandra-driver';

const router = express.Router();

const isValidUuid = (str) => {
  if (!str || typeof str !== 'string') return false;
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regex.test(str);
};

// 1. Créer une nouvelle conversation avec titres personnalisés par participant
router.post('/', async (req, res) => {
  try {
    const { title, userId, participantId, participantIds } = req.body;

    let targets = [];
    if (Array.isArray(participantIds)) {
      targets = participantIds;
    } else if (participantId) {
      targets = [participantId];
    } else if (typeof participantIds === 'string') {
      try {
        targets = JSON.parse(participantIds);
      } catch (e) {
        targets = [participantIds];
      }
    }

    if (userId && !targets.includes(userId)) {
      targets.push(userId);
    }

    const conversationId = uuidv4();

    // Récupérer les noms de tous les participants
    const userNames = {};
    for (const targetId of targets) {
      if (targetId && isValidUuid(String(targetId))) {
        const userRes = await client.execute(
          'SELECT user_id, username FROM chat_app_v2.users WHERE user_id = ?',
          [cassandra.types.Uuid.fromString(String(targetId))],
          { prepare: true }
        );
        if (userRes.rows.length > 0) {
          userNames[targetId] = userRes.rows[0].username;
        }
      }
    }

    const mainTitle = title || (targets.length === 2 ? 'Discussion' : 'Groupe');

    // Insertion dans la table principale conversations
    const queryConv = 'INSERT INTO chat_app_v2.conversations (id, title, created_at) VALUES (?, ?, toTimestamp(now()))';
    await client.execute(
      queryConv,
      [cassandra.types.Uuid.fromString(conversationId), mainTitle],
      { prepare: true }
    );

    // Insertion dans user_conversations avec un titre adapté pour chaque utilisateur
    const queryUserConv = 'INSERT INTO chat_app_v2.user_conversations (user_id, conversation_id, title) VALUES (?, ?, ?)';
    
    for (const targetId of targets) {
      if (targetId && isValidUuid(String(targetId))) {
        let personalTitle = title;
        // Si c'est un chat à deux et qu'aucun titre personnalisé n'est fourni
        if (targets.length === 2) {
          const otherId = targets.find(id => id !== targetId);
          const otherName = userNames[otherId] || 'Utilisateur';
          personalTitle = `Discussion avec ${otherName}`;
        } else if (!personalTitle) {
          personalTitle = 'Discussion de groupe';
        }

        await client.execute(
          queryUserConv,
          [
            cassandra.types.Uuid.fromString(String(targetId)),
            cassandra.types.Uuid.fromString(conversationId),
            personalTitle
          ],
          { prepare: true }
        );
      }
    }

    res.status(201).json({
      id: conversationId,
      title: mainTitle,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur création conversation:', err);
    res.status(500).json({ error: err.message || 'Erreur création conversation.' });
  }
});

// 2. Récupérer toutes les conversations d'un utilisateur (avec anti-doublons)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUuid(userId)) {
      console.warn(`ID utilisateur invalide reçu: ${userId}`);
      return res.status(400).json({ error: 'UUID utilisateur invalide.' });
    }

    const query = 'SELECT conversation_id, title FROM chat_app_v2.user_conversations WHERE user_id = ?';
    const result = await client.execute(
      query,
      [cassandra.types.Uuid.fromString(userId)],
      { prepare: true }
    );

    const formatted = result.rows.map(row => ({
      id: row.conversation_id ? row.conversation_id.toString() : row.id,
      title: row.title
    }));

    // 🧹 Nettoyage des doublons basés sur l'ID de la conversation
    const uniqueConversations = Array.from(
      new Map(formatted.map(conv => [conv.id, conv])).values()
    );

    res.json(uniqueConversations);
  } catch (err) {
    console.error('Erreur récupération conversations utilisateur:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
});

export default router;