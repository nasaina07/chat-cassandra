import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && savedUser !== 'undefined') {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setCurrentUser(null);
    setActiveChat(null);
  };

  if (!currentUser) {
    return <Auth onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="w-1/3 border-r bg-white">
        <Sidebar
          currentUser={currentUser}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          onLogout={handleLogout}
        />
      </div>
      <div className="w-2/3 bg-white">
        <ChatWindow
          currentUser={currentUser}
          activeChat={activeChat}
        />
      </div>
    </div>
  );
}