"use client";

import { useState, useRef, useEffect } from "react";

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
  const [toast, setToast] = useState<string | null>(null);
  const hostRef = useRef<HTMLInputElement | null>(null);
  const [hostExists, setHostExists] = useState<boolean | null>(null);
  const [checkingHost, setCheckingHost] = useState(false);
  // debounce timer
  const hostTimer = useRef<number | null>(null);

  useEffect(() => {
    // focus host input when modal opens
    hostRef.current?.focus();
  }, []);

  // debounced check for host existence
  useEffect(() => {
    setHostExists(null);
    if (hostTimer.current) window.clearTimeout(hostTimer.current);
    if (!host.trim()) return;
    setCheckingHost(true);
    hostTimer.current = window.setTimeout(async () => {
      try {
        const q = new URLSearchParams({ host: host.trim() });
        const res = await fetch(`/api/zbx/check-host?${q.toString()}`);
        const j = await res.json();
        if (res.ok) {
          setHostExists(Boolean(j.exists));
        } else {
          setHostExists(null);
        }
      } catch (e) {
        setHostExists(null);
      } finally {
        setCheckingHost(false);
      }
    }, 600);
    return () => { if (hostTimer.current) window.clearTimeout(hostTimer.current); };
  }, [host]);

  function sanitizeIpInput(val: string) {
    // keep only digits and dots, collapse multiple dots
    let v = val.replace(/[^0-9.]/g, '');
    v = v.replace(/\.+/g, '.');
    // limit to 4 parts
    const parts = v.split('.').slice(0, 4);
    // limit each part to 3 digits
    return parts.map((p) => p.slice(0, 3)).join('.');
  }

  function isValidIPv4(v: string) {
    if (!v) return false;
    const parts = v.split('.');
    if (parts.length !== 4) return false;
    for (const p of parts) {
      if (!/^\d+$/.test(p)) return false;
      const n = Number(p);
      if (n < 0 || n > 255) return false;
      // prevent leading zero like '01'? allow for now
    }
    return true;
  }

  const ipInlineError = ip && !isValidIPv4(ip) ? 'Formato de IP inválido' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const h = host.trim();
    if (!h) return setError("O campo 'host' é obrigatório");
    // Host basic validation: no spaces
    if (/\s/.test(h)) return setError("Host não pode conter espaços");
    if (ip && !isValidIPv4(ip)) return setError('Endereço IP inválido');

    setLoading(true);
    try {
      const body = {
        host: h,
        name: name.trim() || h,
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
        const hostid = json.hostid || json.result?.hostid || null;
        setSuccessHostId(hostid);
        // show toast and clear form
        setToast('Host criado com sucesso');
        setTimeout(() => setToast(null), 3000);
        // clear fields
        setHost('');
        setName('');
        setIp('');
        setGroups('');
        setEnableSnmp(true);
        setCommunity('public');
        onCreated?.(hostid);
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
            <div className="text-green-700">Host criado com sucesso. ID: {successHostId}</div>
          ) : (
            <>
              <input
                ref={hostRef}
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Host"
                className="p-2 rounded bg-white text-black"
                aria-label="host"
              />
              {checkingHost && <div className="text-xs text-gray-600">Verificando disponibilidade...</div>}
              {hostExists === true && <div className="text-sm text-red-600">Host já existe no Zabbix</div>}
              {hostExists === false && <div className="text-sm text-green-700">Host disponível</div>}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome"
                className="p-2 rounded bg-white text-black"
                aria-label="name"
              />
              <div>
                <input
                  value={ip}
                    onChange={(e) => setIp(sanitizeIpInput(e.target.value))}
                    placeholder="IP"
                  className="p-2 rounded bg-white text-black"
                  aria-label="ip"
                />
                {ipInlineError && <div className="text-sm text-red-600">{ipInlineError}</div>}
              </div>
              <input
                value={groups}
                onChange={(e) => setGroups(e.target.value)}
                placeholder="Grupos (vírgula separada)"
                className="p-2 rounded bg-white text-black"
                aria-label="groups"
              />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={enableSnmp} onChange={(e) => setEnableSnmp(e.target.checked)} />
                <span className="text-sm">Habilitar SNMP + templates</span>
              </label>
              {enableSnmp && (
                <input
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  placeholder="Community"
                  className="p-2 rounded bg-white text-black"
                  aria-label="community"
                />
              )}
              <div className="flex gap-2 mt-2">
                <button
                  disabled={loading || (!!ip && !isValidIPv4(ip)) || hostExists === true}
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Criar no Zabbix'}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-400 text-black rounded">Cancelar</button>
              </div>
            </>
          )}
        </form>
        {/* local toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded">{toast}</div>
        )}
      </div>
    </div>
  );
}

