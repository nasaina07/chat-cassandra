import { useState } from 'react';
import axios from 'axios';

export default function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const { data } = await axios.post(`http://localhost:5000${endpoint}`, form);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      alert(err.response?.data?.error || 'Une erreur est survenue');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="w-96 rounded bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold">{isRegister ? 'Inscription' : 'Connexion'}</h2>
        {isRegister && (
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            className="mb-3 w-full rounded border p-2"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          className="mb-3 w-full rounded border p-2"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          className="mb-4 w-full rounded border p-2"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white font-semibold">
          {isRegister ? "S'inscrire" : 'Se connecter'}
        </button>
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="mt-3 text-sm text-blue-500 hover:underline"
        >
          {isRegister ? 'Déjà un compte ? Connexion' : "Pas de compte ? S'inscrire"}
        </button>
      </form>
    </div>
  );
}