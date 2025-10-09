// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // <<< 1. IMPORTE O useRouter
import Link from 'next/link';
import dynamic from 'next/dynamic';
const ZabbixCharts = dynamic(() => import('./ZabbixCharts'), { ssr: false });

type SwitchInfo = {
  id: string;
  hostname: string;
};

type ZbxHost = {
  hostid: string;
  host: string;
  name: string;
  status: string;
  interfaces?: { ip: string }[];
};

export default function DashboardPage() {
  const [switches, setSwitches] = useState<SwitchInfo[]>([]);
  const [zbxHosts, setZbxHosts] = useState<ZbxHost[]>([]);
  const router = useRouter(); // <<< INICIE O HOOK

  useEffect(() => {
    fetch('/api/switches')
      .then((res) => res.json())
      .then((data) => setSwitches(data));
  }, []);

  useEffect(() => {
    fetch('/api/zbx/hosts')
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && Array.isArray(j.hosts)) setZbxHosts(j.hosts);
      })
      .catch(() => {});
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
        <ZabbixCharts />
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
        <div>
          <h3 className="text-black font-semibold mb-2">Switches (App)</h3>
          {switches.length > 0 ? (
            switches.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/switch/${s.id}`}
                className="block bg-gray-800 text-white p-3 rounded-lg hover:bg-gray-900 text-center mb-2"
              >
                {s.hostname.toUpperCase()}
              </Link>
            ))
          ) : (
            <p className="text-black text-center">Nenhum switch registrado.</p>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-black font-semibold mb-2">Hosts (Zabbix)</h3>
          {zbxHosts.length > 0 ? (
            zbxHosts.map((h) => (
              <Link
                key={h.hostid}
                href={`/dashboard/zbx/${h.hostid}`}
                className="block bg-gray-800 text-white p-3 rounded-lg hover:bg-gray-900 text-center mb-2"
                title={h.interfaces?.[0]?.ip ? `IP: ${h.interfaces[0].ip}` : ''}
              >
                {h.name || h.host}
              </Link>
            ))
          ) : (
            <p className="text-black text-center">Nenhum host do Zabbix.</p>
          )}
        </div>
        
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