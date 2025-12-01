"use client";
import { useEffect, useMemo, useState } from "react";
import Card from "./components/Card";
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
  "#e6194b",
  "#3cb44b",
  "#ffe119",
  "#0082c8",
  "#f58231",
  "#911eb4",
  "#46f0f0",
  "#f032e6",
  "#d2f53c",
  "#fabebe",
  "#008080",
  "#e6beff",
  "#aa6e28",
  "#fffac8",
  "#800000",
  "#aaffc3",
  "#808000",
  "#ffd8b1",
  "#000080",
  "#808080",
];

export default function TempsMultiChart({
  minutes = 60,
  hostFilter,
}: {
  minutes?: number;
  hostFilter?: (h: ZbxHost) => boolean;
}) {
  const [hosts, setHosts] = useState<ZbxHost[]>([]);
  const [hostsLoading, setHostsLoading] = useState<boolean>(true);
  const [series, setSeries] = useState<Record<string, Series>>({});
  const [err, setErr] = useState<string | null>(null);

  // Load Zabbix hosts
  useEffect(() => {
    let alive = true;
    setHostsLoading(true);
    fetch("/api/zbx/hosts")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j?.ok && Array.isArray(j.hosts)) {
          const list = (j.hosts as any[]).map((h) => ({
            hostid: h.hostid,
            host: h.host,
            name: h.name,
          })) as ZbxHost[];
          const filtered =
            typeof hostFilter === "function" ? list.filter(hostFilter) : list;
          setHosts(filtered);
        } else {
          setErr(j?.error || "Nenhum host Zabbix encontrado");
        }
      })
      .catch((e) => {
        if (alive) setErr(String(e));
      })
      .finally(() => {
        if (alive) setHostsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [hostFilter]);

  // Fetch traffic series per host (aggregate in+out to single series per host, values in Mb/s)
  useEffect(() => {
    let alive = true;
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          hosts.map(async (h: ZbxHost) => {
            const r = await fetch(
              `/api/zbx/metrics/traffic?host=${encodeURIComponent(
                h.host
              )}&minutes=${minutes}`
            );
            const j = await r.json();
            if (!j?.ok || !j?.traf || !Array.isArray(j.traf.labels))
              return { h, s: null };
            const labels: string[] = j.traf.labels;
            const inVals: number[] = Array.isArray(j.traf.inValues)
              ? j.traf.inValues.map((x: any) => (x == null ? null : Number(x)))
              : [];
            const outVals: (number | null)[] = Array.isArray(j.traf.outValues)
              ? j.traf.outValues.map((x: any) => (x == null ? null : Number(x)))
              : [];
            // Aggregate in+out and bucket by minute to align across hosts
            const bucketSecs = 60; // 1-minute buckets
            const bucketed = new Map<string, number>();
            for (let i = 0; i < labels.length; i++) {
              const inV = Number.isFinite(inVals[i]) ? (inVals[i] as number) : null;
              const outV = outVals[i] != null && Number.isFinite(outVals[i] as number) ? (outVals[i] as number) : null;
              const sum = (inV ?? 0) + (outV ?? 0);
              const ts = Date.parse(labels[i]);
              if (!Number.isFinite(ts)) continue;
              const bucketTs = Math.floor(ts / 1000 / bucketSecs) * bucketSecs * 1000;
              const bucketIso = new Date(bucketTs).toISOString();
              // convert to Mb/s (assuming values are bps)
              const mb = isFinite(sum) ? sum / 1_000_000 : null;
              if (mb == null) continue;
              // keep the latest sample within the bucket
              bucketed.set(bucketIso, mb);
            }
            const bucketLabels = Array.from(bucketed.keys()).sort();
            return { h, s: { labels: bucketLabels, valueByLabel: bucketed } as Series };
          })
        );
        if (!alive) return;
        const ok = (results as Array<{ h: ZbxHost; s: Series | null }>).filter(
          (x) => x.s != null
        ) as { h: ZbxHost; s: Series }[];
        const byHost: Record<string, Series> = {};
        ok.forEach(({ h, s }) => {
          byHost[h.host] = s;
        });
        setSeries(byHost);
      } catch (e: any) {
        if (alive) setErr(String(e));
      }
    };
    if (hosts.length) fetchAll();
    const id = setInterval(fetchAll, 5_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [hosts, minutes]);

  const chart = useMemo(() => {
    const allLabels = new Set<string>();
    (Object.values(series) as Series[]).forEach((s: Series) =>
      s.labels.forEach((l: string) => allLabels.add(l))
    );
    const labels = Array.from(allLabels).sort();
    const datasets = hosts
      .map((h: ZbxHost, idx: number) => {
        const s = series[h.host];
        if (!s) return null;
        const values = labels.map((l) => s.valueByLabel.get(l) ?? null);
        const color = COLORS[idx % COLORS.length];
        return {
          label: h.name || h.host,
          data: values,
          borderColor: color,
          backgroundColor: color + "80",
          spanGaps: true,
          tension: 0.3,
        } as any;
      })
      .filter(Boolean) as any[];
    return { labels, datasets };
  }, [series, hosts]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              `${ctx.dataset.label}: ${
                typeof ctx.parsed.y === "number"
                  ? ctx.parsed.y.toFixed(2)
                  : ctx.parsed.y
              } Mb/s`,
          },
        },
      },
      scales: {
        y: { beginAtZero: false },
      },
      interaction: { mode: "index" as const, intersect: false },
    }),
    []
  );

  if (err) return <div className="text-red-500">Erro: {err}</div>;
  if (hostsLoading) {
    return (
      <Card title={<span>TRÁFEGO (TODOS HOSTS)</span>}>
        <div className="flex flex-col items-center justify-center p-8 text-black">
          <svg
            className="animate-spin h-8 w-8 mb-3 text-gray-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <div>Carregando hosts Zabbix...</div>
        </div>
      </Card>
    );
  }

  if (!hosts.length) {
    return (
      <Card title={<span>TRÁFEGO (TODOS HOSTS)</span>}>
        <div className="p-4 text-black">Nenhum host Zabbix disponível.</div>
      </Card>
    );
  }

  return (
    <Card title={<span>TRÁFEGO (TODOS HOSTS)</span>}>
      {chart.datasets.length ? (
        <div className="h-64">
          <Line data={chart as any} options={options as any} />
        </div>
      ) : (
        <p className="text-black">Nenhum dado de tráfego encontrado.</p>
      )}
    </Card>
  );
}
