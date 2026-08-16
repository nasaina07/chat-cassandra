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

// 1. Récupérer les messages (avec is_read)
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!isValidUuid(conversationId)) {
      return res.status(400).json({ error: 'UUID de conversation invalide.' });
    }

    const query = 'SELECT conversation_id, created_at, id, sender_id, sender_name, content, is_read FROM chat_app_v2.messages WHERE conversation_id = ?';
    const result = await client.execute(query, [cassandra.types.Uuid.fromString(conversationId)], { prepare: true });
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Envoyer un message (is_read à false par défaut)
router.post('/', async (req, res) => {
  try {
    const { conversationId, senderId, senderName, content } = req.body;

    if (!isValidUuid(conversationId) || !isValidUuid(senderId)) {
      return res.status(400).json({ error: 'UUID invalide pour conversation ou expéditeur.' });
    }

    const messageId = uuidv4();
    const query = `
      INSERT INTO chat_app_v2.messages (conversation_id, created_at, id, sender_id, sender_name, content, is_read)
      VALUES (?, toTimestamp(now()), ?, ?, ?, ?, false)
    `;

    await client.execute(
      query,
      [
        cassandra.types.Uuid.fromString(conversationId),
        cassandra.types.Uuid.fromString(messageId),
        cassandra.types.Uuid.fromString(senderId),
        senderName || 'Anonyme',
        content
      ],
      { prepare: true }
    );

    res.status(201).json({
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName || 'Anonyme',
      content,
      is_read: false,
      created_at: new Date()
    });
  } catch (err) {
    console.error('Erreur envoi message:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Marquer les messages comme lus
router.put('/read/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!isValidUuid(conversationId)) {
      return res.status(400).json.error('UUID de conversation invalide.');
    }

    // Récupérer les messages pour identifier leurs clés de partition/clustering dans Cassandra
    const selectQuery = 'SELECT id, created_at, sender_id FROM chat_app_v2.messages WHERE conversation_id = ?';
    const result = await client.execute(selectQuery, [cassandra.types.Uuid.fromString(conversationId)], { prepare: true });

    // Mettre à jour is_read à true pour les messages qui ne viennent pas de l'utilisateur actuel
    for (const row of result.rows) {
      if (row.sender_id.toString() !== userId) {
        const updateQuery = `
          UPDATE chat_app_v2.messages 
          SET is_read = true 
          WHERE conversation_id = ? AND created_at = ? AND id = ?
        `;
        await client.execute(
          updateQuery,
          [cassandra.types.Uuid.fromString(conversationId), row.created_at, row.id],
          { prepare: true }
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur marquage lu:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;