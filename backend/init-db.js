const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'system'
});

async function initializeDatabase() {
  try {
    await client.connect();
    console.log('Connecté au cluster Cassandra.');

    // 1. Création du Keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS chat_app 
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
    `);
    console.log('Keyspace chat_app vérifié/créé.');

    // 2. Table users
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app.users (
          user_id uuid,
          username text,
          email text,
          password text,
          PRIMARY KEY (user_id)
      );
    `);
    console.log('Table users créée.');

    // 3. Table conversations
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app.conversations (
          conversation_id uuid,
          created_at timestamp,
          PRIMARY KEY (conversation_id)
      );
    `);
    console.log('Table conversations créée.');

    // 4. Table user_conversations
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app.user_conversations (
          user_id uuid,
          conversation_id uuid,
          title text,
          PRIMARY KEY (user_id, conversation_id)
      );
    `);
    console.log('Table user_conversations créée.');

    // 5. Table messages_by_conversation
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app.messages_by_conversation (
          conversation_id uuid,
          message_id timeuuid,
          sender_id uuid,
          content text,
          PRIMARY KEY (conversation_id, message_id)
      ) WITH CLUSTERING ORDER BY (message_id ASC);
    `);
    console.log('Table messages_by_conversation créée.');

    console.log('Initialisation de la base de données terminée avec succès.');
    await client.shutdown();
  } catch (err) {
    console.error("Erreur lors de l'initialisation de la base de données :", err);
    await client.shutdown();
    process.exit(1);
  }
}

initializeDatabase();