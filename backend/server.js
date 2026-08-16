import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

// Importation de client et initTables depuis votre config
import client, { initTables } from './config/cassandra.js';

// Importation de vos routes modulaires
import authRoutes from './routes/auth.js';
import conversationsRoutes from './routes/conversations.js';
import messagesRoutes from './routes/messages.js';
import usersRoutes from './routes/users.js';

const app = express();
const server = http.createServer(app);

// Configuration CORS globale pour Express
app.use(cors({
  origin: '*', // Autorise toutes les origines (ou mettez 'http://localhost:5173')
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuration CORS pour Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialiser les tables dans Cassandra/Instaclustr avant de lancer le serveur
initTables().then(() => {
  // Enregistrement des routes
  app.use('/api/auth', authRoutes);
  app.use('/api/conversations', conversationsRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/users', usersRoutes);

  // Socket.io (Temps réel)
  io.on('connection', (socket) => {
    socket.on('joinRoom', (conversationId) => {
      socket.join(conversationId);
    });

    socket.on('sendMessage', (data) => {
      io.to(data.conversationId).emit('message', data);
    });
  });

  // CORRECTION ICI : Utilisation de process.env.PORT pour Render
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Serveur actif sur le port ${PORT}`);
  });
}).catch(err => {
  console.error("Erreur lors de l'initialisation de la base de données :", err);
});