// src/app/dashboard/switch/[id]/comandos/page.tsx
"use client";

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import AnsibleRunner from '../../../components/AnsibleRunner';
import CredentialsList from '../../../components/CredentialsList';

export default function ComandosPage({ params }: { params: { id: string } }) {
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold font-mono">NOME DO SWITCH</h1>
        <Link href={`/dashboard/switch/${params.id}`} className="bg-gray-300 text-black px-6 py-3 rounded-lg hover:bg-gray-400">← VOLTAR</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-3xl font-semibold mb-4 font-mono">LISTA DE COMANDOS</h2>
          <div className="flex flex-col gap-4 max-w-sm">
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">REINICIAR</button>
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">VERSÃO</button>
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">PING</button>
            <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">ALTERAR PORTA</button>
          </div>
        </div>
        <div className="lg:col-span-2">
          <AnsibleRunner target={params.id} credentialId={selectedCredential} />
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-3xl font-semibold mb-4 font-mono">CREDENCIAIS</h2>
          <CredentialsList selected={selectedCredential} onSelect={(id) => setSelectedCredential(id)} />
  const [command, setCommand] = useState<string>('');
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const appendOutput = (text: string) => {
    setOutput((o) => [...o, text]);
    // scroll to bottom on next tick
    setTimeout(() => outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight }), 50);
  };

  const runCommand = async (cmd?: string) => {
    const c = (cmd ?? command).trim();
    if (!c) return;
    setLoading(true);
    appendOutput(`> ${c}`);
    try {
      const res = await fetch(`/api/switch/${params.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: c }),
      });
      const data = await res.json();
      appendOutput(data.output ?? '[sem saída]');
    } catch (err) {
      appendOutput(`Erro: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const clearOutput = () => setOutput([]);

  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <h1 className="text-4xl font-bold mb-4 font-mono">NOME DO SWITCH</h1>
      <h2 className="text-3xl font-semibold mb-8 font-mono">LISTA DE COMANDOS</h2>

      <div className="flex gap-4 flex-col md:flex-row">
        <div className="flex flex-col gap-4 max-w-sm">
          <button onClick={() => runCommand('reboot')} className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">REINICIAR</button>
          <button onClick={() => runCommand('show version')} className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">VERSÃO</button>
          <button onClick={() => runCommand('ping 8.8.8.8 -c 4')} className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">PING</button>
          <button onClick={() => runCommand('change-port 1/1')} className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">ALTERAR PORTA</button>
        </div>

        <div className="flex-1">
          <div className="mb-2 flex gap-2">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Terminal"
              className="flex-1 p-2 rounded text-white"
            />
            <button onClick={() => runCommand()} disabled={loading} className="bg-blue-600 px-4 rounded">{loading ? '...' : 'Executar'}</button>
            <button onClick={clearOutput} className="bg-gray-500 px-3 rounded">Limpar</button>
          </div>

          <div ref={outputRef} className="bg-black text-green-300 p-4 rounded h-64 overflow-auto font-mono">
            {output.length === 0 ? (
              <div className="opacity-60">Sem saída — execute um comando.</div>
            ) : (
              output.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>

          <div className="mt-6">
            <Link href={`/dashboard/switch/${params.id}`} className="bg-gray-300 text-black px-6 py-3 rounded-lg hover:bg-gray-400">
              ← VOLTAR
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}