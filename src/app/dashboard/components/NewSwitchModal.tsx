"use client";

import { useState } from "react";

type Props = {
  onClose?: () => void;
  onCreated?: (hostid: string) => void;
};

export default function NewSwitchModal({ onClose, onCreated }: Props) {
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [groups, setGroups] = useState("");
  const [enableSnmp, setEnableSnmp] = useState(true);
  const [community, setCommunity] = useState("public");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successHostId, setSuccessHostId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!host.trim()) return setError("O campo 'host' é obrigatório");
    setLoading(true);
    try {
      const body = {
        host: host.trim(),
        name: name.trim() || host.trim(),
        ip: ip.trim() || undefined,
        groups: groups ? groups.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        enableSnmp,
        community: community.trim() || undefined,
      } as any;

      const res = await fetch('/api/zbx/create-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Falha ao criar host no Zabbix');
      } else {
        setSuccessHostId(json.hostid || json.result?.hostid || null);
        onCreated?.(json.hostid || json.result?.hostid || null);
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-200 p-6 rounded-lg w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Criar Host no Zabbix</h3>
          <button onClick={onClose} className="text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <div className="text-red-600">{error}</div>}
          {successHostId ? (
            <div className="text-green-700">
              Host criado com sucesso. ID: {successHostId}
            </div>
          ) : (
            <>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Host (único, ex: SWITCH-CISCO)" className="p-2 rounded bg-white text-black" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome visível (opcional)" className="p-2 rounded bg-white text-black" />
              <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Endereço IP (opcional)" className="p-2 rounded bg-white text-black" />
              <input value={groups} onChange={(e) => setGroups(e.target.value)} placeholder="Grupos (vírgula separada, opcional)" className="p-2 rounded bg-white text-black" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={enableSnmp} onChange={(e) => setEnableSnmp(e.target.checked)} />
                <span className="text-sm">Habilitar SNMP + templates</span>
              </label>
              {enableSnmp && (
                <input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="SNMP Community (padrão: public)" className="p-2 rounded bg-white text-black" />
              )}
              <div className="flex gap-2 mt-2">
                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Criar no Zabbix'}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-400 text-black rounded">Cancelar</button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
