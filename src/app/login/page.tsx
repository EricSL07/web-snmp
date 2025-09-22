// src/app/login/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password: senha }),
      });

      if (res.ok) {
        // Se o login for bem-sucedido, redireciona para o dashboard
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Falha no login.');
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-700">
      <div className="bg-gray-200 p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-8 font-mono tracking-widest">WEB-SNMP</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500 bg-red-100 p-2 rounded-lg">{error}</p>}
          <input
            type="text"
            placeholder="LOGIN"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="p-3 rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
          />
          <input
            type="password"
            placeholder="SENHA"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="p-3 rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
          />
          <button type="submit" className="p-3 mt-4 bg-gray-400 text-gray-800 rounded-lg hover:bg-gray-500 transition-colors">
            ENTRAR
          </button>
          <Link href="/registrar" className="p-3 bg-gray-400 text-gray-800 rounded-lg hover:bg-gray-500 transition-colors">
            REGISTRAR
          </Link>
        </form>
      </div>
    </div>
  );
}