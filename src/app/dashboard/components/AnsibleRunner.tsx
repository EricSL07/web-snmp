"use client";
import { useEffect, useImperativeHandle, useState, forwardRef } from "react";

type RunResult = { rc?: number; stdout?: string; stderr?: string; error?: string };
export type AnsibleRunnerHandle = {
  run: () => void;
  preset: (name: "ping" | "version" | "interfaces", opts?: { autoRun?: boolean }) => void;
  setLimit: (value: string) => void;
};

function AnsibleRunnerInner({ target }: { target?: string }, ref: React.Ref<AnsibleRunnerHandle>) {
  const [playbook, setPlaybook] = useState<string>("cisco_show_version.yml");
  const [extra, setExtra] = useState<string>("{}");
  const [limit, setLimit] = useState<string>(target || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    // keep limit in sync if parent target changes
    if (target && target !== limit) setLimit(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body: any = { playbook };
      try {
        const parsed = JSON.parse(extra || "{}");
        body.extra_vars = parsed;
      } catch {
        // ignore parse error, send no extra vars
      }
      if (limit) body.limit = limit;
      const res = await fetch("/api/ansible", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (name: "ping" | "version" | "interfaces", opts?: { autoRun?: boolean }) => {
    if (name === "ping") {
      setPlaybook("ping.yml");
      setExtra("{}");
      if (target) setLimit(target);
    } else if (name === "version") {
      setPlaybook("cisco_show_version.yml");
      setExtra("{}");
      if (target) setLimit(target);
    } else if (name === "interfaces") {
      setPlaybook("cisco_show_ip_int_brief.yml");
      setExtra("{}");
      if (target) setLimit(target);
    }
    if (opts?.autoRun) setTimeout(() => run(), 0);
  };

  useImperativeHandle(ref, () => ({
    run,
    preset: applyPreset,
    setLimit: (value: string) => setLimit(value),
  }));

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg w-full max-w-xl">
      <h3 className="text-lg font-semibold mb-3">Executar Ansible</h3>
      <div className="flex gap-2 mb-3">
        <button onClick={() => applyPreset("version", { autoRun: false })} className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm">Preset: VERSÃO</button>
        <button onClick={() => applyPreset("interfaces", { autoRun: false })} className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm">Preset: IP INT BRIEF</button>
      </div>
  <label className="block text-sm mb-1">Playbook</label>
      <input value={playbook} onChange={(e) => setPlaybook(e.target.value)} className="w-full p-2 rounded bg-gray-700 border border-gray-600 mb-3" placeholder="ping.yml" />
  <label className="block text-sm mb-1">Limit (host ou grupo do inventário)</label>
  <input value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full p-2 rounded bg-gray-700 border border-gray-600 mb-3" placeholder="ex.: mock-switch ou mock" />
      <label className="block text-sm mb-1">Extra Vars (JSON)</label>
      <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={6} className="w-full p-2 rounded bg-gray-700 border border-gray-600 font-mono text-sm" />
      <div className="mt-3 flex gap-2">
        <button onClick={run} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded">{loading ? 'Executando…' : 'Executar'}</button>
        <button onClick={() => setResult(null)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Limpar</button>
      </div>
  {result && (
        <div className="mt-4">
          {typeof result.rc === 'number' && (
            <div className="text-sm">Código de retorno: <span className={result.rc === 0 ? 'text-green-400' : 'text-red-400'}>{result.rc}</span></div>
          )}
          {result.error && (<pre className="mt-2 bg-black/40 p-2 rounded overflow-auto text-red-300">{result.error}</pre>)}
          {result.stdout && (<>
            <div className="mt-2 text-sm text-gray-300">STDOUT</div>
            <pre className="bg-black/40 p-2 rounded overflow-auto whitespace-pre-wrap">{result.stdout}</pre>
          </>)}
          {result.stderr && (<>
            <div className="mt-2 text-sm text-gray-300">STDERR</div>
            <pre className="bg-black/40 p-2 rounded overflow-auto whitespace-pre-wrap text-yellow-200">{result.stderr}</pre>
          </>)}
        </div>
      )}
    </div>
  );
}

const AnsibleRunner = forwardRef(AnsibleRunnerInner);
export default AnsibleRunner;
