// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // <<< 1. IMPORTE O useRouter
import Link from 'next/link';
import { ChartComponent } from './ChartComponent';

type SwitchInfo = {
  id: string;
  hostname: string;
};

export default function DashboardPage() {
  const [switches, setSwitches] = useState<SwitchInfo[]>([]);
  const router = useRouter(); // <<< INICIE O HOOK

  useEffect(() => {
    fetch('/api/switches')
      .then((res) => res.json())
      .then((data) => setSwitches(data));
  }, []);

  // <<< 2. CRIE A FUNÇÃO DE LOGOUT
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        // Redireciona para a página de login após o sucesso
        router.push('/login');
      } else {
        console.error('Falha ao fazer logout');
      }
    } catch (error) {
      console.error('Erro de conexão ao tentar fazer logout', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-700 text-white">
      <main className="flex-1 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-4 rounded-lg"><h2 className="text-xl text-black font-bold text-center mb-4">TEMPERATURA</h2><ChartComponent /></div>
          <div className="bg-white p-4 rounded-lg"><h2 className="text-xl text-black font-bold text-center mb-4">TRÁFEGO</h2><ChartComponent /></div>
        </div>
        <div className="flex gap-4 mt-8">
          <button className="bg-gray-300 text-black px-6 py-2 rounded-lg hover:bg-gray-400">
            ← VOLTAR
          </button>
          <Link href="/dashboard/switch/registrar" className="bg-gray-300 text-black px-6 py-2 rounded-lg hover:bg-gray-400">
            NOVO SWITCH
          </Link>
        </div>
      </main>
      <aside className="w-64 bg-gray-300 p-6 flex flex-col gap-4">
        <h2 className="text-2xl text-black font-bold text-center">MAIS INFORMAÇÕES</h2>
        {switches.length > 0 ? (
          switches.map((s) => (
            <Link 
              key={s.id} 
              href={`/dashboard/switch/${s.id}`} 
              className="bg-gray-800 text-white p-4 rounded-lg hover:bg-gray-900 text-center"
            >
              {s.hostname.toUpperCase()}
            </Link>
          ))
        ) : (
          <p className="text-black text-center">Nenhum switch registrado.</p>
        )}
        
        {/* Usamos flex-grow para empurrar o botão para o final */}
        <div className="flex-grow"></div> 

        {/* <<< 3. ADICIONE O BOTÃO DE LOGOUT AQUI */}
        <button 
          onClick={handleLogout}
          className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors w-full"
        >
          DESLOGAR
        </button>
      </aside>
    </div>
  );
}