"use client";
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type ZbxHost = { hostid: string; host: string; name: string };
type Series = { labels: string[]; valueByLabel: Map<string, number> };

const COLORS = [
  "#e6194b", "#3cb44b", "#ffe119", "#0082c8", "#f58231",
  "#911eb4", "#46f0f0", "#f032e6", "#d2f53c", "#fabebe",
  "#008080", "#e6beff", "#aa6e28", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000080", "#808080"
];

export default function TempsMultiChart({ minutes = 60, hostFilter }: { minutes?: number; hostFilter?: (h: ZbxHost) => boolean }) {
  const [hosts, setHosts] = useState<ZbxHost[]>([]);
  const [series, setSeries] = useState<Record<string, Series>>({});
  const [err, setErr] = useState<string| null>(null);

  // Load Zabbix hosts
  useEffect(() => {
    fetch('/api/zbx/hosts')
      .then(r => r.json())
      .then(j => {
        if (j?.ok && Array.isArray(j.hosts)) {
          const list = (j.hosts as any[]).map((h) => ({ hostid: h.hostid, host: h.host, name: h.name })) as ZbxHost[];
          const filtered = typeof hostFilter === 'function' ? list.filter(hostFilter) : list;
          setHosts(filtered);
        }
      })
      .catch(e => setErr(String(e)));
  }, [hostFilter]);

  // Fetch temperature series per host
  useEffect(() => {
    let alive = true;
    const fetchAll = async () => {
      try {
        const results = await Promise.all(hosts.map(async (h: ZbxHost) => {
          const r = await fetch(`/api/zbx/metrics/temp?host=${encodeURIComponent(h.host)}&minutes=${minutes}`);
          const j = await r.json();
          if (!j?.ok || !j?.temp || !Array.isArray(j.temp.labels) || !Array.isArray(j.temp.values)) return { h, s: null };
          const labels: string[] = j.temp.labels;
          const vals: number[] = j.temp.values.map((x: any) => Number(x));
          const map = new Map<string, number>();
          for (let i = 0; i < Math.min(labels.length, vals.length); i++) {
            if (Number.isFinite(vals[i])) map.set(labels[i], vals[i]);
          }
          return { h, s: { labels, valueByLabel: map } as Series };
        }));
        if (!alive) return;
        const ok = (results as Array<{ h: ZbxHost; s: Series | null }>).filter((x) => x.s != null) as { h: ZbxHost; s: Series }[];
        const byHost: Record<string, Series> = {};
        ok.forEach(({ h, s }) => { byHost[h.host] = s; });
        setSeries(byHost);
      } catch (e: any) {
        if (alive) setErr(String(e));
      }
    };
    if (hosts.length) fetchAll();
    const id = setInterval(fetchAll, 180_000);
    return () => { alive = false; clearInterval(id); };
  }, [hosts, minutes]);

  const chart = useMemo(() => {
    const allLabels = new Set<string>();
    (Object.values(series) as Series[]).forEach((s: Series) => s.labels.forEach((l: string) => allLabels.add(l)));
    const labels = Array.from(allLabels).sort();
    const datasets = hosts.map((h: ZbxHost, idx: number) => {
      const s = series[h.host];
      if (!s) return null;
      const values = labels.map(l => s.valueByLabel.get(l) ?? null);
      const color = COLORS[idx % COLORS.length];
      return {
        label: h.name || h.host,
        data: values,
        borderColor: color,
        backgroundColor: color + '80',
        spanGaps: true,
        tension: 0.3,
      } as any;
    }).filter(Boolean) as any[];
    return { labels, datasets };
  }, [series, hosts]);

  const options = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${typeof ctx.parsed.y === 'number' ? ctx.parsed.y.toFixed(2) : ctx.parsed.y} °C` }
      }
    },
    scales: {
      y: { beginAtZero: false }
    },
    interaction: { mode: 'index' as const, intersect: false }
  }), []);

  if (err) return <div className="text-red-500">Erro: {err}</div>;
  if (!hosts.length) return <div className="text-black">Nenhum host Zabbix disponível.</div>;

  return (
    <div className="bg-white p-4 rounded-lg">
      <h2 className="text-xl text-black font-bold text-center mb-4">TEMPERATURA (TODOS HOSTS)</h2>
      {chart.datasets.length ? (
        <Line data={chart as any} options={options as any} />
      ) : (
        <p className="text-black">Nenhum dado de temperatura encontrado.</p>
      )}
    </div>
  );
}
