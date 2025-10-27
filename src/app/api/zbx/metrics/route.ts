import { NextResponse } from "next/server";
import { zabbixGetTemperatureSeries, zabbixGetTrafficSeries, zabbixGetHosts } from "@/lib/zabbix";

// GET /api/zbx/metrics?host=<host>&minutes=60
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let host = searchParams.get("host") || "";
  const minutes = Number(searchParams.get("minutes") || 60);
  try {
    if (!host) {
      // pick first host from Zabbix as sensible default when none provided
      const hosts = await zabbixGetHosts();
      if (Array.isArray(hosts) && hosts.length) host = hosts[0].host;
    }
    if (!host) return NextResponse.json({ ok: false, error: "No host specified" }, { status: 400 });

    const [temp, traf] = await Promise.all([
      zabbixGetTemperatureSeries(host, minutes).catch((e) => ({ error: String(e) })),
      zabbixGetTrafficSeries(host, minutes).catch((e) => ({ error: String(e) })),
    ]);
    return NextResponse.json({ ok: true, host, minutes, temp, traf });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
