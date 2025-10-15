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

type SeriesResp = {
  ok: boolean;
  host: string;
  minutes: number;
  temp?: any;
  traf?: any;
  error?: string;
};

export default function ZabbixCharts({ host = "SWITCH-CISCO", minutes = 60, mode = 'both' }: { host?: string; minutes?: number; mode?: 'both' | 'temp' | 'traffic' }) {
  const [tempData, setTempData] = useState<any | null>(null);
  const [trafData, setTrafData] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Poll Temperature every 180s
  useEffect(() => {
    let alive = true;
    const fetchOnce = () => {
      fetch(`/api/zbx/metrics/temp?host=${encodeURIComponent(host)}&minutes=${minutes}`)
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (j.ok) setTempData(j.temp);
          else setErr(j.error || 'Erro ao obter temperatura');
        })
        .catch((e) => alive && setErr(String(e)));
    };
    fetchOnce();
    const id = setInterval(fetchOnce, 180_000);
    return () => { alive = false; clearInterval(id); };
  }, [host, minutes]);

  // Poll Traffic every 60s
  useEffect(() => {
    let alive = true;
    const fetchOnce = () => {
      fetch(`/api/zbx/metrics/traffic?host=${encodeURIComponent(host)}&minutes=${minutes}`)
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (j.ok) setTrafData(j.traf);
          else setErr(j.error || 'Erro ao obter trafego');
        })
        .catch((e) => alive && setErr(String(e)));
    };
    fetchOnce();
    const id = setInterval(fetchOnce, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [host, minutes]);

  const tempChart = useMemo(() => {
    if (!tempData || (tempData as any)?.error) return null;
    const labels = tempData.labels as string[];
    const values = tempData.values as number[];
    return {
      labels,
      datasets: [
        {
          label: tempData.item?.name || "Temperature",
          data: values,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          tension: 0.3,
        },
      ],
    };
  }, [tempData]);

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

  const showTemp = mode === 'both' || mode === 'temp';
  const showTraffic = mode === 'both' || mode === 'traffic';

  return (
    <div className={`grid grid-cols-1 ${mode==='both' ? 'md:grid-cols-2' : ''} gap-8`}>
      {showTemp && (
        <div className="bg-white p-4 rounded-lg">
          <h2 className="text-xl text-black font-bold text-center mb-4">TEMPERATURA</h2>
          {tempChart ? (
            <Line options={chartOptions} data={tempChart} />
          ) : (
            <p className="text-black">Nenhum dado de temperatura encontrado.</p>
          )}
        </div>
      )}
      {showTraffic && (
        <div className="bg-white p-4 rounded-lg">
          <h2 className="text-xl text-black font-bold text-center mb-4">TRÁFEGO</h2>
          {trafChart ? (
            <Line options={chartOptions} data={trafChart} />
          ) : (
            <p className="text-black">Nenhum dado de tráfego encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
