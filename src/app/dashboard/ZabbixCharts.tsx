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

type SeriesResp = {
  ok: boolean;
  host: string;
  minutes: number;
  temp?: any;
  traf?: any;
  error?: string;
};

export default function ZabbixCharts({ host, minutes = 60, mode = 'both' }: { host?: string; minutes?: number; mode?: 'both' | 'temp' | 'traffic' }) {
  const [memData, setMemData] = useState<any | null>(null);
  const [trafData, setTrafData] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [memLoading, setMemLoading] = useState(false);
  const [trafLoading, setTrafLoading] = useState(false);
  const [trafMode] = useState<'iface' | 'total'>('total');

  // Fetch helpers so we can also refresh on demand
  const fetchMemOnce = async () => {
    setMemLoading(true);
    try {
      setErr(null);
  const memUrl = `/api/zbx/metrics/memory?${host ? `host=${encodeURIComponent(host)}&` : ""}minutes=${minutes}`;
  const r = await fetch(memUrl);
      const j = await r.json();
      if (j?.ok) setMemData(j.mem);
      else setErr(j.error || "Erro ao obter memória");
    } catch (e: any) {
      setErr(String(e));
    } finally {
      setMemLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchMemOnce();
    const id = setInterval(() => { if (alive) fetchMemOnce(); }, 5_000);
    return () => { alive = false; clearInterval(id); };
  }, [host, minutes]);

  const fetchTrafOnce = async () => {
    setTrafLoading(true);
    try {
      setErr(null);
  const trafUrl = `/api/zbx/metrics/traffic?${host ? `host=${encodeURIComponent(host)}&` : ""}minutes=${minutes}${trafMode === 'total' ? '&aggregate=1' : ''}`;
  const r = await fetch(trafUrl);
      const j = await r.json();
      if (j?.ok) setTrafData(j.traf);
      else setErr(j.error || "Erro ao obter trafego");
    } catch (e: any) {
      setErr(String(e));
    } finally {
      setTrafLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchTrafOnce();
    const id = setInterval(() => { if (alive) fetchTrafOnce(); }, 5_000);
    return () => { alive = false; clearInterval(id); };
  }, [host, minutes, trafMode]);

  const memChart = useMemo(() => {
    if (!memData || (memData as any)?.error) return null;
    const labels = memData.labels as string[];
    const values = (memData.values as number[]).map((v) => (Number.isFinite(v) ? v : NaN));
    if (!labels || !values) return null;
    const max = values.reduce((a, b) => Math.max(a, Math.abs(b || 0)), 0);
    const isBytes = max > 1000; // heuristic: if values large, treat as bytes
    const data = isBytes ? values.map((v) => v / 1_000_000) : values;
    const unit = isBytes ? "MB" : "%";
    return {
      labels,
      datasets: [
        {
          label: `Uso de memória (${unit})`,
          data,
          borderColor: "rgb(255, 159, 64)",
          backgroundColor: "rgba(255, 159, 64, 0.5)",
          tension: 0.3,
        },
      ],
    };
  }, [memData]);

  const trafChart = useMemo(() => {
    if (!trafData || (trafData as any)?.error) return null;
    const labels = trafData.labels as string[];
    const inValues = (trafData.inValues as number[]).map((v: number) => v / 1_000_000); // Mb/s
    const outValues = (trafData.outValues as (number | null)[]).map((v: number | null) => (v == null ? null : v / 1_000_000));
    return {
      labels,
      datasets: [
        {
          label: (trafData.iface?.inItem?.name || "Inbound") + " (Mb/s)",
          data: inValues,
          borderColor: "rgb(53, 162, 235)",
          backgroundColor: "rgba(53, 162, 235, 0.5)",
          tension: 0.3,
        },
        {
          label: (trafData.iface?.outItem?.name || "Outbound") + " (Mb/s)",
          data: outValues,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          tension: 0.3,
        },
      ],
    };
  }, [trafData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || "";
            const v = ctx.parsed.y;
            return `${label}: ${typeof v === "number" ? v.toFixed(2) : v}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            // assume traffic charts dominate; temperature values typically small, no unit needed here
            return `${value}`;
          },
        },
      },
    },
    interaction: { mode: "index" as const, intersect: false },
  }), []);

  if (err) return <div className="text-red-500">Erro: {err}</div>;

  const showTemp = mode === "both" || mode === "temp";
  const showTraffic = mode === "both" || mode === "traffic";

  return (
    <div className={`grid grid-cols-1 ${mode === "both" ? "md:grid-cols-2" : ""} gap-8`}>
      {showTemp && (
        <Card
          title={<span>MEMÓRIA</span>}
        >
          {memChart ? (
            <Line options={chartOptions} data={memChart} />
          ) : (
            <p className="text-black">Nenhum dado de memória encontrado.</p>
          )}
        </Card>
      )}
      {showTraffic && (
        <Card
          title={<span>TRÁFEGO (TOTAL)</span>}
        >
          {trafChart ? (
            <Line options={chartOptions} data={trafChart} />
          ) : (
            <p className="text-black">Nenhum dado de tráfego encontrado.</p>
          )}
        </Card>
      )}
    </div>
  );
}
