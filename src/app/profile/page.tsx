// src/app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type User = {
  login?: string;
  name?: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch usuário atual ao carregar página
  useEffect(() => {
    fetch('/api/auth/user')
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then((data) => {
        if (data.ok) {
          setUser(data);
          setName(data.name || '');
        } else {
          setError(data.error || 'Falha ao carregar perfil.');
          // Redireciona para login se não autenticado
          if (data.error?.includes('autenticado')) {
            setTimeout(() => router.push('/login'), 2000);
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar perfil:', err);
        setError('Erro de conexão ou não autenticado.');
        setTimeout(() => router.push('/login'), 2000);
      });
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    // Validação básica
    if (newPassword && newPassword !== confirmPassword) {
      setError('As senhas não coincidem!');
      setLoading(false);
      return;
    }

    if (newPassword && !currentPassword) {
      setError('Senha atual é obrigatória para alterar a senha.');
      setLoading(false);
      return;
    }

    try {
      const payload: any = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Perfil atualizado com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (data.user) {
          setUser(data.user);
          setName(data.user.name || '');
        }
      } else {
        setError(data.error || 'Falha ao atualizar perfil.');
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita!')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        router.push('/login');
      } else {
        setError(data.error || 'Falha ao deletar conta.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao deletar conta.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-700">
        <div className="bg-gray-200 p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
          <p className="text-black">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-700">
      <div className="bg-gray-200 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-black text-3xl font-bold mb-6 text-center font-mono">PERFIL</h1>

        {message && <p className="text-green-600 bg-green-100 p-2 rounded-lg mb-4">{message}</p>}
        {error && <p className="text-red-500 bg-red-100 p-2 rounded-lg mb-4">{error}</p>}

        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
          <div>
            <label className="block text-black font-semibold mb-2">Login</label>
            <input
              type="text"
              value={user.login || ''}
              disabled
              className="w-full p-3 rounded-lg bg-gray-300 text-black text-center placeholder-gray-600 focus:outline-none cursor-not-allowed opacity-60"
            />
          </div>

          <div>
            <label className="block text-black font-semibold mb-2">Nome</label>
            <input
              type="text"
              placeholder="Digite seu nome (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => (e.currentTarget.placeholder = '')}
              onBlur={(e) => (e.currentTarget.placeholder = 'Digite seu nome (opcional)')}
              className="w-full p-3 rounded-lg bg-gray-300 text-black text-center placeholder-gray-600 focus:outline-none"
            />
          </div>

          <hr className="my-4 border-gray-400" />

          <h2 className="text-black font-bold mt-4">Alterar Senha</h2>

          <div>
            <label className="block text-black font-semibold mb-2">Senha Atual</label>
            <input
              type="password"
              placeholder="(deixe em branco para não alterar)"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onFocus={(e) => (e.currentTarget.placeholder = '')}
              onBlur={(e) => (e.currentTarget.placeholder = '(deixe em branco para não alterar)')}
              className="w-full p-3 rounded-lg bg-gray-300 text-black text-center placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-black font-semibold mb-2">Nova Senha</label>
            <input
              type="password"
              placeholder="(deixe em branco para não alterar)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={(e) => (e.currentTarget.placeholder = '')}
              onBlur={(e) => (e.currentTarget.placeholder = '(deixe em branco para não alterar)')}
              className="w-full p-3 rounded-lg bg-gray-300 text-black text-center placeholder-gray-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-black font-semibold mb-2">Confirmar Nova Senha</label>
            <input
              type="password"
              placeholder="(deixe em branco para não alterar)"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={(e) => (e.currentTarget.placeholder = '')}
              onBlur={(e) => (e.currentTarget.placeholder = '(deixe em branco para não alterar)')}
              className="w-full p-3 rounded-lg bg-gray-300 text-black text-center placeholder-gray-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="p-3 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Atualizando...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </form>

        <hr className="my-6 border-gray-400" />

        <button
          onClick={handleDeleteAccount}
          disabled={loading}
          className="w-full p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? 'Deletando...' : 'DELETAR CONTA'}
        </button>

        <Link
          href="/dashboard"
          className="block w-full p-3 bg-gray-400 text-black rounded-lg hover:bg-gray-500 transition-colors text-center"
        >
          ← VOLTAR AO DASHBOARD
        </Link>
      </div>
    </div>
  );
}
