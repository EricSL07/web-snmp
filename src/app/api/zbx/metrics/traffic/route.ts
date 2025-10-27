import { NextResponse } from "next/server";
import { zabbixGetTrafficSeries, zabbixGetHosts } from "@/lib/zabbix";

// GET /api/zbx/metrics/traffic?host=<host>&minutes=60
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let host = searchParams.get("host") || "";
  const minutes = Number(searchParams.get("minutes") || 60);
  try {
    if (!host) {
      const hosts = await zabbixGetHosts();
      if (Array.isArray(hosts) && hosts.length) host = hosts[0].host;
    }
    if (!host) return NextResponse.json({ ok: false, error: "No host specified" }, { status: 400 });
    const traf = await zabbixGetTrafficSeries(host, minutes);
    return NextResponse.json({ ok: true, host, minutes, traf });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
