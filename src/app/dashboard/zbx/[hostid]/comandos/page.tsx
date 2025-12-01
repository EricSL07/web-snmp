'use client';
import Link from 'next/link';
import AnsibleRunner, { AnsibleRunnerHandle } from '../../../components/AnsibleRunner';
import { useEffect, useRef, useState } from 'react';

export default function ZbxHostCommands({ params }: { params: { hostid: string } }) {
  const [hostName, setHostName] = useState<string>("");
  const runnerRef = useRef<AnsibleRunnerHandle>(null);
  const [globalCredentials, setGlobalCredentials] = useState<Array<{ id: string; username: string }>>([]);
  // Playbooks em disco (ansible/playbooks)
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [showCreatePb, setShowCreatePb] = useState<boolean>(false);
  const [newPb, setNewPb] = useState<{ name: string; yaml: string }>({ name: '', yaml: '' });
  const [creatingPb, setCreatingPb] = useState<boolean>(false);
  const [createPbMsg, setCreatePbMsg] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editPb, setEditPb] = useState<{ name: string; yaml: string }>({ name: '', yaml: '' });
  const [savingEditPb, setSavingEditPb] = useState<boolean>(false);
  const [editPbMsg, setEditPbMsg] = useState<string | null>(null);
  const [newCred, setNewCred] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [selectedCredentialName, setSelectedCredentialName] = useState<string | null>(null);
  const [autoRunOnSelect, setAutoRunOnSelect] = useState<boolean>(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCred, setEditCred] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<boolean>(false);

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

  const refreshPlaybooks = async () => {
    try {
      const r = await fetch('/api/ansible', { cache: 'no-store' });
      const data = await r.json();
      setPlaybooks(Array.isArray(data.playbooks) ? data.playbooks : []);
    } catch {}
  };

  useEffect(() => {
    refreshGlobalCreds();
    refreshPlaybooks();
  }, []);

  // Pré-definir alvo (limit) com base no Nome do Zabbix para este hostid
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/zbx/host?hostid=${encodeURIComponent(params.hostid)}`, { cache: 'no-store' });
        const data = await r.json();
        if (r.ok && data?.ok && data?.host) {
          const zbxName: string = data.host.name || data.host.host || String(params.hostid);
          setHostName(zbxName);
          // Propaga para o runner como alvo padrão
          if (runnerRef.current) runnerRef.current.setLimit(zbxName);
        }
      } catch {}
    })();
  }, [params.hostid]);

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
      {/* Três colunas: Comandos (esquerda), Executar Ansible (centro), Credenciais (direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Lista de comandos (coluna esquerda) */}
        <div className="bg-gray-800/60 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 font-mono">LISTA DE COMANDOS</h2>
          <div className="flex flex-col gap-4">
            {playbooks.length === 0 ? (
              <div className="opacity-75 text-sm">Nenhum playbook criado nesta página.</div>
            ) : (
              playbooks.map((name) => (
                <div key={name} className="bg-gray-300 text-black p-4 rounded-lg">
                  {editingFile === name ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-mono">Nome do playbook (arquivo)</label>
                      <input
                        className="p-2 rounded bg-gray-200"
                        value={editPb.name}
                        onChange={(e) => setEditPb((v) => ({ ...v, name: e.target.value }))}
                      />
                      <label className="text-xs font-mono">YAML do playbook</label>
                      <textarea
                        className="min-h-[200px] p-2 rounded bg-gray-200 font-mono"
                        value={editPb.yaml}
                        onChange={(e) => setEditPb((v) => ({ ...v, yaml: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500 disabled:opacity-50"
                          disabled={savingEditPb || !editPb.name.trim() || !editPb.yaml.trim()}
                          onClick={async () => {
                            setEditPbMsg(null);
                            setSavingEditPb(true);
                            try {
                              const r = await fetch('/api/ansible/playbooks', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: editingFile, newName: editPb.name.trim(), yaml: editPb.yaml.trim() }),
                              });
                              const data = await r.json();
                              if (!r.ok) {
                                setEditPbMsg(`Erro: ${data?.error || 'Falha ao salvar'}`);
                              } else {
                                setEditPbMsg('Playbook salvo com sucesso.');
                                setEditingFile(null);
                                setEditPb({ name: '', yaml: '' });
                                await refreshPlaybooks();
                              }
                            } catch (e: any) {
                              setEditPbMsg(`Erro: ${String(e)}`);
                            } finally {
                              setSavingEditPb(false);
                            }
                          }}
                        >
                          {savingEditPb ? 'Salvando…' : 'Salvar'}
                        </button>
                        <button
                          className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-400"
                          onClick={() => {
                            setEditingFile(null);
                            setEditPb({ name: '', yaml: '' });
                            setEditPbMsg(null);
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                      {editPbMsg && (
                        <div className={`text-xs mt-1 px-2 py-1 rounded ${editPbMsg.startsWith('Erro') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>{editPbMsg}</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm truncate pr-4" title={name}>{name}</div>
                      <div className="flex gap-2">
                        <button
                          className={`${selectedPlaybook === name ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-green-500 hover:text-white'} px-3 py-1 rounded`}
                          onClick={() => {
                            setSelectedPlaybook(name);
                            runnerRef.current?.setPlaybook(name);
                          }}
                          title="Selecionar playbook"
                        >
                          {selectedPlaybook === name ? 'Selecionado' : 'Selecionar'}
                        </button>
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-400"
                          onClick={async () => {
                            try {
                              const r = await fetch(`/api/ansible/playbooks?name=${encodeURIComponent(name)}`, { cache: 'no-store' })
                              const data = await r.json()
                              if (r.ok) {
                                setEditingFile(name)
                                setEditPb({ name: data.name, yaml: data.yaml })
                              }
                            } catch {}
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500"
                          onClick={async () => {
                            if (!confirm(`Excluir playbook ${name}?`)) return
                            try {
                              const r = await fetch('/api/ansible/playbooks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
                              if (r.ok) {
                                if (selectedPlaybook === name) setSelectedPlaybook(null)
                                await refreshPlaybooks()
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

            {/* Criar novo playbook */}
            <button
              className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-400 w-full"
              onClick={() => setShowCreatePb((v) => !v)}
              title={showCreatePb ? 'Fechar' : 'Adicionar playbook'}
            >
              {showCreatePb ? 'Fechar criação' : 'Adicionar playbook'}
            </button>
            {showCreatePb && (
              <div className="bg-gray-600 p-4 rounded-lg">
                <label className="text-xs font-mono">Nome do playbook (arquivo)</label>
                <input
                  className="w-full mb-2 p-2 rounded text-white bg-gray-500"
                  placeholder="Ex: cisco_show_version.yml"
                  value={newPb.name}
                  onChange={(e) => setNewPb((v) => ({ ...v, name: e.target.value }))}
                />
                <label className="text-xs font-mono">YAML do playbook</label>
                <textarea
                  className="w-full min-h-[220px] mb-2 p-2 rounded text-white bg-gray-500 font-mono"
                  placeholder={`---\n- name: exemplo\n  hosts: all\n  gather_facts: no\n  tasks:\n    - name: ping\n      ping:`}
                  value={newPb.yaml}
                  onChange={(e) => setNewPb((v) => ({ ...v, yaml: e.target.value }))}
                />
                {!newPb.name.trim() && <div className="text-xs text-red-300 mb-2">Nome é obrigatório.</div>}
                {!newPb.yaml.trim() && <div className="text-xs text-red-300 mb-2">YAML é obrigatório.</div>}
                <div className="flex gap-2">
                  <button
                    className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-400 disabled:opacity-50"
                    disabled={creatingPb || !newPb.name.trim() || !newPb.yaml.trim()}
                    onClick={async () => {
                      setCreatePbMsg(null);
                      setCreatingPb(true);
                      try {
                        const r = await fetch('/api/ansible/playbooks', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: newPb.name.trim(), yaml: newPb.yaml.trim() }),
                        });
                        const data = await r.json();
                        if (!r.ok) {
                          setCreatePbMsg(`Erro: ${data?.error || 'Falha ao salvar playbook'}`);
                        } else {
                          setCreatePbMsg('Playbook criado com sucesso.');
                          setShowCreatePb(false);
                          setNewPb({ name: '', yaml: '' });
                          await refreshPlaybooks();
                        }
                      } catch (e: any) {
                        setCreatePbMsg(`Erro: ${String(e)}`);
                      } finally {
                        setCreatingPb(false);
                      }
                    }}
                  >
                    {creatingPb ? 'Salvando…' : 'Salvar playbook'}
                  </button>
                  <button
                    className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-300"
                    onClick={() => {
                      setShowCreatePb(false);
                      setNewPb({ name: '', yaml: '' });
                      setCreatePbMsg(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
                {createPbMsg && (
                  <div className={`mt-3 text-sm px-3 py-2 rounded ${createPbMsg.startsWith('Erro') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {createPbMsg}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        {/* Executar Ansible (coluna central) */}
        <div className="bg-gray-800/60 rounded-lg p-6 flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4 font-mono">EXECUTAR ANSIBLE</h2>
          <div className="mb-3 text-sm text-gray-200 flex flex-col items-center gap-1">
            {selectedCredentialId ? (
              <span>Credencial ativa: <span className="text-green-400 font-mono">{selectedCredentialName || selectedCredentialId}</span></span>
            ) : (
              <span>Nenhuma credencial ativa</span>
            )}
            {selectedPlaybook ? (
              <span>Playbook selecionado: <span className="text-blue-300 font-mono">{selectedPlaybook}</span></span>
            ) : (
              <span>Nenhum playbook selecionado</span>
            )}
          </div>
          <div className="w-full max-w-3xl mx-auto">
            <AnsibleRunner
              ref={runnerRef}
              target={hostName}
              credentialId={selectedCredentialId}
              canRun={Boolean(selectedPlaybook && selectedCredentialId)}
              guardMessage={!selectedPlaybook || !selectedCredentialId ? 'Selecione um playbook e uma credencial para executar' : undefined}
            />
          </div>
        </div>
        {/* Credenciais (coluna direita) */}
        <div className="bg-gray-800/60 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 font-mono">CREDENCIAIS</h2>
          <div className="flex flex-col gap-3">
            {globalCredentials.length === 0 ? (
              <div className="opacity-75 text-sm">Nenhuma credencial cadastrada ainda.</div>
            ) : (
              globalCredentials.map((gc) => (
                <div key={gc.id} className="bg-gray-300 text-black p-4 rounded-lg shadow">
                  {editingId === gc.id ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-mono">Usuário</label>
                      <input
                        value={editCred.username}
                        onChange={(e) => setEditCred((c) => ({ ...c, username: e.target.value }))}
                        placeholder="Digite o usuário"
                        className="w-full p-2 rounded bg-gray-200"
                      />
                      <label className="text-xs font-mono">Senha</label>
                      <input
                        value={editCred.password}
                        onChange={(e) => setEditCred((c) => ({ ...c, password: e.target.value }))}
                        placeholder="Digite a senha"
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
                      <div className="font-mono text-sm truncate pr-4">{gc.username}</div>
                      <div className="flex gap-2">
                        <button
                          className={`${selectedCredentialId === gc.id ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-green-500 hover:text-white'} px-3 py-1 rounded`}
                          title="Selecionar credencial"
                          onClick={() => {
                            setSelectedCredentialId(gc.id);
                            setSelectedCredentialName(gc.username);
                          }}
                        >
                          {selectedCredentialId === gc.id ? 'Selecionado' : 'Selecionar'}
                        </button>
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-400"
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
                          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-400"
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
            {/* Botão de nova credencial (+) */}
            <button
              className="mt-4 self-center w-14 h-14 rounded-lg bg-blue-500 text-white text-3xl leading-[3.5rem] text-center hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={() => setShowCreate((v) => !v)}
              title={showCreate ? 'Fechar' : 'Nova credencial'}
            >
              {showCreate ? '–' : '+'}
            </button>
            {showCreate && (
              <div className="mt-3 p-4 rounded bg-gray-600 shadow">
                <label className="text-xs font-mono">Usuário</label>
                <input
                  value={newCred.username}
                  onChange={(e) => setNewCred((c) => ({ ...c, username: e.target.value }))}
                  placeholder="Digite o usuário"
                  className="w-full mb-2 p-2 rounded text-white bg-gray-500"
                />
                <label className="text-xs font-mono">Senha</label>
                <input
                  value={newCred.password}
                  onChange={(e) => setNewCred((c) => ({ ...c, password: e.target.value }))}
                  placeholder="Digite a senha"
                  type="password"
                  className="w-full mb-2 p-2 rounded text-white bg-gray-500"
                />
                {!newCred.username?.trim() && <div className="text-xs text-red-300 mb-2">Usuário é obrigatório.</div>}
                {!newCred.password && <div className="text-xs text-red-300 mb-2">Senha é obrigatória.</div>}
                <div className="flex gap-2">
                  <button
                    onClick={createGlobalCredential}
                    disabled={creating}
                    className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Criando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setNewCred({ username: '', password: '' });
                      setCreateMsg(null);
                    }}
                    className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
                {createMsg && (
                  <div className={`mt-3 text-sm px-3 py-2 rounded ${createMsg.startsWith('Erro') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {createMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
