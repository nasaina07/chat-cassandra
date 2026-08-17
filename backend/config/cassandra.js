import cassandra from 'cassandra-driver';

const client = new cassandra.Client({
  contactPoints: process.env.CASSANDRA_CONTACT_POINTS 
    ? process.env.CASSANDRA_CONTACT_POINTS.split(',') 
    : ['34.218.4.113', '35.92.27.50', '54.71.44.170'],
  localDataCenter: process.env.CASSANDRA_DATACENTER || 'AWS_VPC_US_WEST_2',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'chat_app_v2',
  credentials: { 
    username: process.env.CASSANDRA_USER || 'iccassandra', 
    password: process.env.CASSANDRA_PASSWORD || 'cae7eaa897c28535c925f667693769ed' 
  }
});

export async function initTables() {
  try {
    await client.connect();
    
    // Création du Keyspace si il n'existe pas
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS chat_app_v2 
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'};
    `);

    // Création de la table users
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app_v2.users (
        user_id uuid PRIMARY KEY,
        username text,
        email text,
        password text,
        password_hash text,
        created_at timestamp
      );
    `);

    try {
      await client.execute(`ALTER TABLE chat_app_v2.users ADD password_hash text;`);
    } catch (e) {}

    try {
      await client.execute(`ALTER TABLE chat_app_v2.users ADD created_at timestamp;`);
    } catch (e) {}

    // Création de la table users_by_email
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app_v2.users_by_email (
        email text PRIMARY KEY,
        user_id uuid,
        username text,
        password text,
        password_hash text,
        created_at timestamp
      );
    `);

    try {
      await client.execute(`ALTER TABLE chat_app_v2.users_by_email ADD password_hash text;`);
    } catch (e) {}

    try {
      await client.execute(`ALTER TABLE chat_app_v2.users_by_email ADD created_at timestamp;`);
    } catch (e) {}

    // Création de la table user_conversations
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app_v2.user_conversations (
        user_id uuid,
        conversation_id uuid,
        title text,
        PRIMARY KEY (user_id, conversation_id)
      );
    `);

    // Création de la table conversations
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app_v2.conversations (
        id uuid PRIMARY KEY,
        title text,
        created_at timestamp
      );
    `);

    // Création de la table messages
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_app_v2.messages (
        conversation_id uuid,
        created_at timestamp,
        id uuid,
        sender_id uuid,
        sender_name text,
        content text,
        is_read boolean,
        PRIMARY KEY (conversation_id, created_at, id)
      ) WITH CLUSTERING ORDER BY (created_at ASC, id ASC);
    `);

    // Ajout automatique de la colonne is_read si elle n'existe pas encore
    try {
      await client.execute(`ALTER TABLE chat_app_v2.messages ADD is_read boolean;`);
    } catch (e) {}

    console.log('✅ Keyspace et tables mis à jour avec succès dans chat_app_v2 !');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
}

export default client;