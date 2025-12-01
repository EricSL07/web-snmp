// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // <<< 1. IMPORTE O useRouter
import Link from "next/link";
import dynamic from "next/dynamic";
import NewSwitchModal from "./components/NewSwitchModal";
const ZabbixCharts = dynamic(() => import("./ZabbixCharts"), { ssr: false });
const TempsMultiChart = dynamic(() => import("./TempsMultiChart"), {
  ssr: false,
});

type SwitchInfo = {
  id: string;
  hostname: string;
};

type ZbxHost = {
  hostid: string;
  host: string;
  name: string;
  status: string;
  interfaces?: { ip: string }[];
};

export default function DashboardPage() {
  const [switches, setSwitches] = useState<SwitchInfo[]>([]);
  const [zbxHosts, setZbxHosts] = useState<ZbxHost[]>([]);
  const [showNewSwitchModal, setShowNewSwitchModal] = useState(false);
  const router = useRouter(); // <<< INICIE O HOOK
  const [currentUser, setCurrentUser] = useState<{ login?: string; name?: string } | null>(null);

  useEffect(() => {
    fetch("/api/switches")
      .then((res) => res.json())
      .then((data) => setSwitches(data));
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchHosts = () => {
      fetch("/api/zbx/hosts")
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (j?.ok && Array.isArray(j.hosts)) setZbxHosts(j.hosts);
        })
        .catch(() => {});
    };
    fetchHosts();
    const id = setInterval(() => { if (alive) fetchHosts(); }, 5_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Fetch current logged-in user to display in the sidebar
  useEffect(() => {
    fetch('/api/auth/user')
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) {
          setCurrentUser(data);
        }
      })
      .catch(() => {});
  }, []);

  // <<< 2. CRIE A FUNÇÃO DE LOGOUT
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        // Redireciona para a página de login após o sucesso
        router.push("/login");
      } else {
        console.error("Falha ao fazer logout");
      }
    } catch (error) {
      console.error("Erro de conexão ao tentar fazer logout", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-700 text-white">
      <main className="flex-1 p-8">
        <div className="mb-8">
          {/* Mostrar tráfego para todos os hosts Zabbix (sem filtro restritivo) */}
          <TempsMultiChart minutes={60} />
        </div>
        {/* Espaço principal (conteúdo da dashboard) */}
        <div className="mt-8" />
      </main>
      <aside className="w-64 bg-gray-400 p-6 flex flex-col gap-4">
        <h2 className="text-2xl text-black font-bold text-center">
          MAIS INFORMAÇÕES
        </h2>
        <div className="mt-4">
          <h3 className="text-black font-semibold mb-2">Hosts (Zabbix)</h3>
          {zbxHosts.length > 0 ? (
            zbxHosts.map((h) => (
              <Link
                key={h.hostid}
                href={`/dashboard/zbx/${h.hostid}`}
                className="block bg-gray-900 text-white p-3 rounded-lg hover:bg-gray-900 text-center mb-2"
                title={h.interfaces?.[0]?.ip ? `IP: ${h.interfaces[0].ip}` : ""}
              >
                {h.name || h.host}
              </Link>
            ))
          ) : (
            <p className="text-black text-center">Nenhum host do Zabbix.</p>
          )}
        </div>

        {/* Botão 'NOVO SWITCH' colocado abaixo do último host ativo */}
        <div className="mt-4">
          <button
            onClick={() => setShowNewSwitchModal(true)}
            className="w-full bg-white text-black p-3 rounded-lg hover:bg-gray-400 mb-4"
          >
            NOVO SWITCH
          </button>
        </div>

        {/* Usamos flex-grow para empurrar o botão para o final */}
        <div className="flex-grow"></div>

        {/* Mostrar usuário logado acima do botão de logout */}
        <div>
          <button
            onClick={() => router.push('/profile')}
            className="w-full bg-white text-black p-3 rounded-lg mb-2 hover:bg-gray-400 transition-colors text-center"
            title={currentUser?.login || ''}
          >
            {currentUser ? `Olá, ${currentUser.name || currentUser.login}` : 'Usuário'}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors w-full"
        >
          DESLOGAR
        </button>
      </aside>
      {showNewSwitchModal && (
        <NewSwitchModal
          onClose={() => setShowNewSwitchModal(false)}
          onCreated={(hostid) => {
            setShowNewSwitchModal(false);
            // Refresh hosts list after creation
            fetch("/api/zbx/hosts")
              .then((r) => r.json())
              .then((j) => {
                if (j?.ok && Array.isArray(j.hosts)) setZbxHosts(j.hosts);
              })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
