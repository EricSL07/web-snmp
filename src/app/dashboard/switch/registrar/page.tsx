// src/app/dashboard/switch/registrar/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistrarSwitchPage() {
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/switches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname, ipAddress, group }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Falha no registro.');
      }
    } catch (err) {
      setError('Ocorreu um erro de conexão.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-700">
      <div className="bg-gray-200 p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-8 font-mono">Registrar Switch</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500">{error}</p>}
          <input
            type="text"
            placeholder="NOME DO HOST"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            className="p-3 rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
          />
           <input
            type="text"
            placeholder="ENDEREÇO IP"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            className="p-3 rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
          />
          <input
            type="text"
            placeholder="GRUPO DO HOST"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="p-3 rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
          />
          <button type="submit" className="p-3 mt-4 bg-gray-400 text-gray-800 rounded-lg hover:bg-gray-500">
            REGISTRAR
          </button>
          <Link href="/dashboard" className="p-3 bg-gray-400 text-gray-800 rounded-lg hover:bg-gray-500">
            VOLTAR
          </Link>
        </form>
      </div>
    </div>
  );
}