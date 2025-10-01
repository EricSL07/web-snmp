// src/app/dashboard/switch/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
// Reutilize o componente de gráfico que já criamos
import { ChartComponent } from '../../ChartComponent'; 

// Definindo um tipo para os dados do switch para usar com TypeScript
type SwitchData = {
  id: string;
  hostname: string;
  ipAddress: string;
  group: string;
  location: string | null;
};

export default function SwitchDetailsPage({ params }: { params: { id: string } }) {
  const [switchData, setSwitchData] = useState<SwitchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/switches/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setSwitchData(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <p className="text-white text-center p-10">Carregando...</p>;
  if (!switchData) return <p className="text-white text-center p-10">Switch não encontrado.</p>;

  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 font-mono">{switchData.hostname}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-4 rounded-lg"><h2 className="text-xl text-black font-bold text-center mb-4">TEMPERATURA</h2><ChartComponent /></div>
          <div className="bg-white p-4 rounded-lg"><h2 className="text-xl text-black font-bold text-center mb-4">TRÁFEGO</h2><ChartComponent /></div>
          <div className="bg-gray-600 p-6 rounded-lg"><h2 className="text-xl font-bold mb-4">PORTAS E ESTADOS</h2><p>Dados das portas aqui...</p></div>
          <div className="bg-gray-600 p-6 rounded-lg"><h2 className="text-xl font-bold mb-4">DETALHES DA REDE</h2>
            <p>TAXA DE TRÁFEGO: ...</p>
            <p>IP DO DISPOSITIVO: {switchData.ipAddress}</p>
            <p>MAC DO DISPOSITIVO: ...</p>
          </div>
        </div>
        {/* Sidebar */}
        <aside className="bg-gray-300 text-black p-6 rounded-lg flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center">MAIS INFORMAÇÕES</h2>
          <div className="bg-gray-800 text-white p-3 rounded-lg">NOME: {switchData.hostname}</div>
          <div className="bg-gray-800 text-white p-3 rounded-lg">LOCALIZAÇÃO: {switchData.location || 'Não definida'}</div>
          <div className="bg-gray-800 text-white p-3 rounded-lg">UPTIME: ...</div>
          <div className="flex-grow"></div>
          <Link href={`/dashboard/switch/${params.id}/comandos`} className="bg-gray-500 text-white p-4 rounded-lg text-center hover:bg-gray-600">
            COMANDOS
          </Link>
        </aside>
      </div>
      <div className="mt-8">
        <Link href="/dashboard" className="bg-gray-300 text-black px-6 py-3 rounded-lg hover:bg-gray-400">
          ← VOLTAR
        </Link>
      </div>
    </div>
  );
}