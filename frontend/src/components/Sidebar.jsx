import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, LogOut, MessageSquare, Search, User } from 'lucide-react';

export default function Sidebar({ currentUser, activeChat, setActiveChat, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Extraire l'ID de l'utilisateur connecté de manière sécurisée
  const currentUserId = currentUser?.id || currentUser?.user_id;

  // Charger les conversations existantes
  const fetchConversations = async () => {
    if (!currentUserId) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/conversations/user/${currentUserId}`);
      setConversations(response.data || []);
    } catch (err) {
      console.error('Erreur chargement conversations:', err);
    }
  };

  // Rechercher la liste de tous les utilisateurs
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchUsers();
    }
  }, [currentUserId]);

  // Démarrer une conversation privée
  const startDirectMessage = async (targetUser) => {
    const targetUserId = targetUser?.id || targetUser?.user_id;

    if (!currentUserId || !targetUserId) {
      console.error('Identifiants introuvables :', { currentUserId, targetUserId });
      alert('Impossible d\'ouvrir la discussion : identifiant utilisateur manquant.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: `Discussion avec ${targetUser.username}`,
        userId: currentUserId,
        participantId: targetUserId
      };

      const res = await axios.post('http://localhost:5000/api/conversations', payload);
      
      // Recharger la liste des conversations
      await fetchConversations();
      
      // Activer le salon sélectionné
      if (res.data) {
        setActiveChat(res.data);
      }
      setSearchUser('');
    } catch (err) {
      console.error('Erreur création conversation directe:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (!newChatTitle.trim() || !currentUserId) return;

    try {
      setLoading(true);
      const res = await axios.post('http://localhost:5000/api/conversations', {
        title: newChatTitle,
        userId: currentUserId
      });
      setNewChatTitle('');
      await fetchConversations();
      if (res.data) setActiveChat(res.data);
    } catch (err) {
      console.error('Erreur création salon:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les utilisateurs (exclure soi-même et appliquer le terme de recherche)
  const filteredUsers = users.filter((u) => {
    const uId = u.id || u.user_id;
    const isNotSelf = String(uId).toLowerCase() !== String(currentUserId).toLowerCase();
    const query = searchUser.trim().toLowerCase();
    const matchesName = u.username ? u.username.toLowerCase().includes(query) : false;
    const matchesEmail = u.email ? u.email.toLowerCase().includes(query) : false;

    return isNotSelf && (matchesName || matchesEmail);
  });

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 border-b flex items-center justify-between bg-gray-50">
        <h1 className="text-xl font-bold text-gray-800">Conversations</h1>
      </div>

      {/* Barre de recherche d'utilisateurs */}
      <div className="p-3 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchUser.trim() !== '' && (
          <div className="mt-2 max-h-40 overflow-y-auto border rounded-md bg-white divide-y shadow-sm">
            {filteredUsers.length === 0 ? (
              <p className="p-2 text-xs text-gray-500 text-center">Aucun utilisateur trouvé</p>
            ) : (
              filteredUsers.map((u) => {
                const userIdVal = u.id || u.user_id;
                return (
                  <div
                    key={userIdVal}
                    onClick={() => startDirectMessage(u)}
                    className="p-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-sm text-gray-700"
                  >
                    <User size={16} className="text-blue-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">{u.username}</span>
                      {u.email && <span className="text-xs text-gray-400">{u.email}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Création de salon */}
      <form onSubmit={handleCreateChat} className="p-3 border-b flex gap-2">
        <input
          type="text"
          placeholder="Titre du salon..."
          value={newChatTitle}
          onChange={(e) => setNewChatTitle(e.target.value)}
          className="flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center justify-center disabled:opacity-50"
          title="Créer un salon"
        >
          <Plus size={18} />
        </button>
      </form>

      {/* Liste des conversations */}
      <div className="flex-1 overflow-y-auto divide-y">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Aucune conversation pour le moment.
          </div>
        ) : (
          conversations.map((chat) => {
            const isSelected = activeChat && activeChat.id === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-3 cursor-pointer transition flex items-center gap-3 ${
                  isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                }`}
              >
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <MessageSquare size={18} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h2 className="font-semibold text-sm text-gray-800 truncate">{chat.title}</h2>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Profil connecté */}
      <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase">
            {currentUser?.username ? currentUser.username.substring(0, 2) : 'US'}
          </div>
          <span className="text-xs text-gray-700 font-medium truncate">
            {currentUser?.username}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition font-semibold"
        >
          <LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}