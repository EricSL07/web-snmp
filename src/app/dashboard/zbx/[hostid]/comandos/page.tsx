'use client';
import Link from 'next/link';
import AnsibleRunner, { AnsibleRunnerHandle } from '../../../components/AnsibleRunner';
import { useEffect, useRef, useState } from 'react';

export default function ZbxHostCommands({ params }: { params: { hostid: string } }) {
  const [hostName, setHostName] = useState<string>("");
  const runnerRef = useRef<AnsibleRunnerHandle>(null);
  const [globalCredentials, setGlobalCredentials] = useState<Array<{ id: string; username: string }>>([]);
  const [newCred, setNewCred] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [selectedCredentialName, setSelectedCredentialName] = useState<string | null>(null);
  const [autoRunOnSelect, setAutoRunOnSelect] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCred, setEditCred] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const refreshGlobalCreds = async () => {
    try {
      const res = await fetch('/api/credentials');
      if (res.ok) {
        const list = await res.json();
        // API returns array of {id, name, username, type}. Map minimally for display.
        setGlobalCredentials(Array.isArray(list) ? list.map((c: any) => ({ id: String(c.id), username: String(c.username) })) : []);
      }
    } catch {}
  };

  useEffect(() => {
    refreshGlobalCreds();
  }, []);

  const createGlobalCredential = async () => {
    setCreateMsg(null);
    const payload = { username: newCred.username?.trim(), password: newCred.password };
    if (!payload.username || !payload.password) {
      setCreateMsg('Informe usuário e senha.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateMsg(`Erro: ${data?.error || 'Falha ao criar credencial'}`);
      } else {
        setCreateMsg('Credencial criada com sucesso.');
        setNewCred({ username: '', password: '' });
        await refreshGlobalCreds();
      }
    } catch (e: any) {
      setCreateMsg(`Erro: ${String(e)}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-mono">HOST ZABBIX: {hostName || params.hostid}</h1>
        <Link href={`/dashboard/zbx/${params.hostid}`} className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400">← VOLTAR</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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
          <div className="mb-3 text-sm text-gray-300">
            {selectedCredentialId ? (
              <span>Credencial ativa: <span className="text-green-400 font-mono">{selectedCredentialName || selectedCredentialId}</span></span>
            ) : (
              <span>Nenhuma credencial ativa</span>
            )}
          </div>
          <AnsibleRunner ref={runnerRef} target={hostName} credentialId={selectedCredentialId} />
        </div>

        {/* Credenciais Globais (nova coluna) */}
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-semibold mb-4 font-mono">CREDENCIAIS GLOBAIS</h2>
          <div className="flex flex-col gap-2 max-w-sm">
            {globalCredentials.length === 0 ? (
              <div className="opacity-75 text-sm">Nenhuma credencial global cadastrada ainda.</div>
            ) : (
              globalCredentials.map((gc) => (
                <div key={gc.id} className="bg-gray-300 text-black p-3 rounded-lg">
                  {editingId === gc.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={editCred.username}
                        onChange={(e) => setEditCred((c) => ({ ...c, username: e.target.value }))}
                        placeholder="Usuário"
                        className="w-full p-2 rounded bg-gray-200"
                      />
                      <input
                        value={editCred.password}
                        onChange={(e) => setEditCred((c) => ({ ...c, password: e.target.value }))}
                        placeholder="Senha"
                        type="password"
                        className="w-full p-2 rounded bg-gray-200"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setEditMsg(null);
                            if (!editCred.username?.trim() || !editCred.password) {
                              setEditMsg('Informe usuário e senha.');
                              return;
                            }
                            setSavingEdit(true);
                            try {
                              // Since there's no update endpoint, recreate: delete old by id, then POST new
                              await fetch(`/api/credentials?id=${encodeURIComponent(gc.id)}`, { method: 'DELETE' });
                              const res = await fetch('/api/credentials', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  username: editCred.username.trim(),
                                  password: editCred.password,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                setEditMsg(`Erro: ${data?.error || 'Falha ao salvar'}`);
                              } else {
                                setEditingId(null);
                                setEditCred({ username: '', password: '' });
                                await refreshGlobalCreds();
                                setEditMsg('Alterações salvas.');
                              }
                            } catch (e: any) {
                              setEditMsg(`Erro: ${String(e)}`);
                            } finally {
                              setSavingEdit(false);
                            }
                          }}
                          disabled={savingEdit}
                          className="bg-green-400 text-black px-3 py-1 rounded hover:bg-green-300 disabled:opacity-50"
                        >
                          {savingEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditCred({ username: '', password: '' });
                            setEditMsg(null);
                          }}
                          className="bg-gray-400 text-black px-3 py-1 rounded hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                      {editMsg && <div className="text-xs mt-1 opacity-80">{editMsg}</div>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        className={`px-2 py-1 rounded font-mono ${selectedCredentialId === gc.id ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-gray-200'}`}
                        title="Usar esta credencial"
                        onClick={() => {
                          setSelectedCredentialId(gc.id);
                          setSelectedCredentialName(gc.username);
                          if (autoRunOnSelect) runnerRef.current?.run();
                        }}
                      >
                        {gc.username}
                      </button>
                      <div className="flex gap-2">
                        <button
                          className="bg-blue-400 text-black px-2 py-1 rounded hover:bg-blue-300"
                          onClick={() => {
                            setEditingId(gc.id);
                            // Pre-fill edit form
                            setEditCred({ username: gc.username, password: '' });
                            setEditMsg(null);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="bg-red-400 text-black px-2 py-1 rounded hover:bg-red-300"
                          onClick={async () => {
                            try {
                              await fetch(`/api/credentials?id=${encodeURIComponent(gc.id)}`, { method: 'DELETE' });
                              await refreshGlobalCreds();
                              if (selectedCredentialId === gc.id) {
                                setSelectedCredentialId(null);
                                setSelectedCredentialName(null);
                              }
                            } catch {}
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-200">
              <input id="autorun" type="checkbox" checked={autoRunOnSelect} onChange={(e) => setAutoRunOnSelect(e.target.checked)} />
              <label htmlFor="autorun">Executar automaticamente ao selecionar credencial</label>
            </div>
            <div className="text-xs opacity-60">Estas credenciais são globais e não se referem a um host específico.</div>

            {/* Criar nova credencial global */}
            <div className="mt-4 p-3 rounded bg-gray-600">
              <div className="font-mono font-semibold mb-2">Nova credencial</div>
              <input
                value={newCred.username}
                onChange={(e) => setNewCred((c) => ({ ...c, username: e.target.value }))}
                placeholder="Usuário (obrigatório)"
                className="w-full mb-2 p-2 rounded text-white bg-gray-500"
              />
              <input
                value={newCred.password}
                onChange={(e) => setNewCred((c) => ({ ...c, password: e.target.value }))}
                placeholder="Senha (obrigatório)"
                type="password"
                className="w-full mb-2 p-2 rounded text-white bg-gray-500"
              />
              <button
                onClick={createGlobalCredential}
                disabled={creating}
                className="bg-green-400 text-black px-3 py-2 rounded hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Criando...' : 'Criar credencial'}
              </button>
              {createMsg && <div className="mt-2 text-sm opacity-80">{createMsg}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
