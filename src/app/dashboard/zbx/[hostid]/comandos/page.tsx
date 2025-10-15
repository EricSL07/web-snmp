'use client';
import Link from 'next/link';
import AnsibleRunner, { AnsibleRunnerHandle } from '../../../components/AnsibleRunner';
import { useEffect, useRef, useState } from 'react';

export default function ZbxHostCommands({ params }: { params: { hostid: string } }) {
  const [hostName, setHostName] = useState<string>("");
  const runnerRef = useRef<AnsibleRunnerHandle>(null);

  // Resolve Zabbix host details to get name/host for inventory limit
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/zbx/host?hostid=${params.hostid}`);
        const data = await res.json();
        if (data?.ok && data.host) {
          // Prefer 'host' (technical) fallback to 'name'
          const h = data.host.host || data.host.name || String(params.hostid);
          setHostName(h);
          // Pre-configure limit in runner
          runnerRef.current?.setLimit(h);
        }
      } catch {}
    };
    load();
  }, [params.hostid]);

  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-mono">HOST ZABBIX: {hostName || params.hostid}</h1>
        <Link href={`/dashboard/zbx/${params.hostid}`} className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400">← VOLTAR</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de comandos (lado esquerdo) */}
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-semibold mb-4 font-mono">LISTA DE COMANDOS</h2>
          <div className="flex flex-col gap-4 max-w-sm">
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400" onClick={() => runnerRef.current?.preset('version', { autoRun: true })}>VERSÃO (Cisco)</button>
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400" onClick={() => runnerRef.current?.preset('interfaces', { autoRun: true })}>SHOW IP INT BRIEF</button>
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400" onClick={() => { if (runnerRef.current) { runnerRef.current.setLimit(hostName); } }}>Definir alvo: {hostName || params.hostid}</button>
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400" disabled>REINICIAR (em breve)</button>
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400" disabled>ALTERAR PORTA (em breve)</button>
          </div>
        </div>
        {/* Saída do Ansible (lado direito) */}
        <div className="lg:col-span-2">
          <AnsibleRunner ref={runnerRef} target={hostName} />
        </div>
      </div>
    </div>
  );
}
