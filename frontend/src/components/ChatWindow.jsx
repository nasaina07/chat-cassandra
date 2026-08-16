import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Search, ArrowLeft, Send } from 'lucide-react';

let socket;

export default function ChatWindow({ currentUser, activeChat, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    socket = io('http://localhost:5000');

    if (activeChat?.id) {
      socket.emit('joinRoom', activeChat.id);

      // 1. Charger les messages
      axios.get(`http://localhost:5000/api/messages/${activeChat.id}`)
        .then(res => {
          setMessages(res.data || []);
          scrollToBottom();
          
          // 2. Marquer automatiquement les messages comme lus à l'ouverture
          axios.put(`http://localhost:5000/api/messages/read/${activeChat.id}`, {
            userId: currentUser.id
          }).catch(err => console.error('Erreur marquage lu:', err));
        })
        .catch(err => console.error('Erreur chargement messages:', err));
    }

    socket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    // Écouter si l'autre utilisateur a lu les messages en temps réel
    socket.on('messagesRead', ({ conversationId }) => {
      if (activeChat?.id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, is_read: true }))
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeChat, currentUser.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat?.id) return;

    const messageData = {
      conversationId: activeChat.id,
      senderId: currentUser.id,
      senderName: currentUser.username,
      content: newMessage,
      is_read: false,
      createdAt: new Date().toISOString()
    };

    try {
      await axios.post('http://localhost:5000/api/messages', messageData);
      socket.emit('sendMessage', messageData);
      setNewMessage('');
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
    }
  };

  const filteredMessages = messages.filter(msg => {
    const text = msg.content || msg.message || msg.text || '';
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-3 border-b flex items-center justify-between bg-white shadow-sm gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
            title="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-800 truncate">
            {activeChat?.title || 'Discussion'}
          </h2>
        </div>

        <div className="relative w-40 sm:w-64">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search size={16} className="absolute right-2.5 top-2.5 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-400 my-8 text-sm">
            {searchQuery ? 'Aucun message trouvé.' : 'Aucun message dans ce salon.'}
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id || msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-gray-500 mb-0.5 px-1">
                  {msg.sender_name || msg.senderName || 'Utilisateur'}
                </span>
                
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="break-words">{msg.content || msg.message || msg.text}</p>
                  
                  {isMe && (
                    <div className="text-right text-[10px] mt-0.5 opacity-90 font-bold">
                      {msg.is_read || msg.isRead ? '✓✓' : '✓'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          placeholder="Écrivez votre message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center font-medium gap-1"
        >
          <span>Envoyer</span>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}