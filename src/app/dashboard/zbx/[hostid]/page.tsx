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
  const totalMbps = ports.reduce((acc, p) => acc + ((p.in_bps || 0) + (p.out_bps || 0)) / 1_000_000, 0);
  const portsUp = ports.length;
  const saturating = ports.filter((p) => {
    const speed = Number(p.speed_mbps || 0);
    const used = ((p.in_bps || 0) + (p.out_bps || 0)) / 1_000_000;
    return speed > 0 && used >= speed * 0.8;
  }).length;

  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 font-mono">{host.name || host.host}</h1>
      {/* KPIs Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-600 p-4 rounded-lg">
          <div className="text-sm text-gray-300">IP</div>
          <div className="text-2xl font-mono">{ip}</div>
        </div>
        <div className="bg-gray-600 p-4 rounded-lg">
          <div className="text-sm text-gray-300">STATUS</div>
          <div className="text-2xl font-mono">{host.status === '0' ? 'Habilitado' : 'Desabilitado'}</div>
        </div>
        <div className="bg-gray-600 p-4 rounded-lg">
          <div className="text-sm text-gray-300">TRÁFEGO TOTAL (Mb/s)</div>
          <div className="text-2xl font-mono">{totalMbps.toFixed(2)}</div>
        </div>
        <div className="bg-gray-600 p-4 rounded-lg">
          <div className="text-sm text-gray-300">PORTAS UP / SATURANDO</div>
          <div className="text-2xl font-mono">{portsUp} / {saturating}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl text-black font-bold text-center mb-4">MEMÓRIA</h2>
            <ZabbixCharts host={host.hostid} minutes={60} mode="temp" />
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl text-black font-bold text-center mb-4">TRÁFEGO</h2>
            <ZabbixCharts host={host.hostid} minutes={60} mode="traffic" />
          </div>
          <div className="bg-gray-600 p-6 rounded-lg md:col-span-2">
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
                      <th className="py-2 pr-2">Erros (In/Out)</th>
                      <th className="py-2 pr-2">Descartes (In/Out)</th>
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
                        <td className="py-1 pr-2">{(p.in_errors ?? 0)} / {(p.out_errors ?? 0)}</td>
                        <td className="py-1 pr-2">{(p.in_discards ?? 0)} / {(p.out_discards ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhuma porta encontrada.</p>
            )}
          </div>
        </div>
        {/* Sidebar: Problemas (Triggers) */}
        <aside className="bg-gray-300 text-black p-6 rounded-lg flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center">PROBLEMAS</h2>
          <TriggersList hostid={host.hostid} />
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

function formatPriority(p: number) {
  const names = ["Not class.", "Information", "Warning", "Average", "High", "Disaster"];
  return names[Math.max(0, Math.min(5, Number(p) || 0))];
}

function formatAgo(epochSecStr?: string) {
  const sec = Number(epochSecStr || 0);
  if (!sec) return "";
  const delta = Math.max(0, Math.floor(Date.now()/1000) - sec);
  const h = Math.floor(delta/3600);
  const m = Math.floor((delta%3600)/60);
  const s = delta%60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}

function TriggersList({ hostid }: { hostid: string }) {
  const [trigs, setTrigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchOnce = async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams({ hostid }).toString();
        const r = await fetch(`/api/zbx/triggers?${q}`);
        const j = await r.json();
        if (!alive) return;
        if (j?.ok) setTrigs(j.triggers || []);
        else setErr(j.error || "Erro ao obter triggers");
      } catch (e: any) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchOnce();
    const id = setInterval(() => { if (alive) fetchOnce(); }, 5_000);
    return () => { alive = false; clearInterval(id); };
  }, [hostid]);

  if (err) return <div className="text-red-600">{err}</div>;
  if (loading) return <div className="text-gray-700">Carregando...</div>;
  if (!trigs.length) return <div className="text-gray-700">Nenhum problema ativo.</div>;

  return (
    <div className="flex flex-col gap-2">
      {trigs.map((t) => (
        <div key={t.triggerid} className="bg-gray-800 text-white p-3 rounded-lg">
          <div className="text-sm">
            <span className="font-semibold">{formatPriority(Number(t.priority))}</span>
            <span className="ml-2 text-gray-300">há {formatAgo(t.lastchange)}</span>
          </div>
          <div className="mt-1">{t.description}</div>
          {t.comments ? <div className="mt-1 text-gray-300 text-sm">{t.comments}</div> : null}
        </div>
      ))}
    </div>
  );
}
