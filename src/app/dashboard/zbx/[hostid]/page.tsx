'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
const ZabbixCharts = dynamic(() => import('../../ZabbixCharts'), { ssr: false });

type HostDetails = {
  hostid: string;
  host: string;
  name: string;
  status: string;
  interfaces?: { ip: string }[];
};

export default function ZbxHostPage({ params }: { params: { hostid: string } }) {
  const [host, setHost] = useState<HostDetails | null>(null);
  const [uptime, setUptime] = useState<{ seconds: number; lastclock: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ports, setPorts] = useState<any[]>([]);

  useEffect(() => {
    const q = new URLSearchParams({ hostid: params.hostid }).toString();
    fetch(`/api/zbx/host?${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) {
          setHost(j.host || null);
          setUptime(j.uptime || null);
        }
      })
      .finally(() => setLoading(false));
  }, [params.hostid]);

  useEffect(() => {
    const q = new URLSearchParams({ hostid: params.hostid, limit: '12' }).toString();
    fetch(`/api/zbx/ports?${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setPorts(j.ports || []);
      })
      .catch(() => {});
  }, [params.hostid]);

  if (loading) return <p className="text-white text-center p-10">Carregando...</p>;
  if (!host) return <p className="text-white text-center p-10">Host não encontrado.</p>;

  const ip = host.interfaces?.[0]?.ip || 'N/D';

  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 font-mono">{host.name || host.host}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl text-black font-bold text-center mb-4">TEMPERATURA</h2>
            <ZabbixCharts host={host.hostid} minutes={60} mode="temp" />
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl text-black font-bold text-center mb-4">TRÁFEGO</h2>
            <ZabbixCharts host={host.hostid} minutes={60} mode="traffic" />
          </div>
          <div className="bg-gray-600 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-1">PORTAS E ESTADOS</h2>
            <p className="text-sm text-gray-300 mb-3">Exibindo apenas interfaces operacionais (up).</p>
            {ports.length ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-2">Porta</th>
                      <th className="py-2 pr-2">VLAN</th>
                      <th className="py-2 pr-2">Oper</th>
                      <th className="py-2 pr-2">Velocidade</th>
                      <th className="py-2 pr-2">In</th>
                      <th className="py-2 pr-2">Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ports.map((p) => (
                      <tr key={p.index} className="border-t border-gray-500/40">
                        <td className="py-1 pr-2">{p.name}</td>
                        <td className="py-1 pr-2">{p.vlan ?? 'N/D'}</td>
                        <td className="py-1 pr-2">{p.oper}</td>
                        <td className="py-1 pr-2">{p.speed_mbps ? `${p.speed_mbps.toFixed(0)} Mb/s` : 'N/D'}</td>
                        <td className="py-1 pr-2">{(p.in_bps/1_000_000).toFixed(2)} Mb/s</td>
                        <td className="py-1 pr-2">{(p.out_bps/1_000_000).toFixed(2)} Mb/s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhuma porta encontrada.</p>
            )}
          </div>
          <div className="bg-gray-600 p-6 rounded-lg"><h2 className="text-xl font-bold mb-4">DETALHES DA REDE</h2>
            <p>STATUS: {host.status === '0' ? 'Habilitado' : 'Desabilitado'}</p>
            <p>IP DO DISPOSITIVO: {ip}</p>
            <p>UPTIME: {uptime ? `${Math.floor(uptime.seconds/3600)}h ${Math.floor((uptime.seconds%3600)/60)}m` : 'N/D'}</p>
          </div>
        </div>
        {/* Sidebar */}
        <aside className="bg-gray-300 text-black p-6 rounded-lg flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center">MAIS INFORMAÇÕES</h2>
          <div className="bg-gray-800 text-white p-3 rounded-lg">NOME: {host.name || host.host}</div>
          <div className="bg-gray-800 text-white p-3 rounded-lg">IP: {ip}</div>
          <div className="bg-gray-800 text-white p-3 rounded-lg">UPTIME: {uptime ? `${Math.floor(uptime.seconds/3600)}h ${Math.floor((uptime.seconds%3600)/60)}m` : 'N/D'}</div>
          <div className="flex-grow"></div>
          <Link href={`/dashboard/zbx/${host.hostid}/comandos`} className="bg-gray-500 text-white p-4 rounded-lg text-center hover:bg-gray-600">COMANDOS</Link>
        </aside>
      </div>
      <div className="mt-8">
        <Link href="/dashboard" className="bg-gray-300 text-black px-6 py-3 rounded-lg hover:bg-gray-400">← VOLTAR</Link>
      </div>
    </div>
  );
}
