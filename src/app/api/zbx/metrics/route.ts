import { NextResponse } from "next/server";
import { zabbixGetTemperatureSeries, zabbixGetTrafficSeries } from "@/lib/zabbix";

// GET /api/zbx/metrics?host=SWITCH-CISCO&minutes=60
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") || "SWITCH-CISCO";
  const minutes = Number(searchParams.get("minutes") || 60);
  try {
    const [temp, traf] = await Promise.all([
      zabbixGetTemperatureSeries(host, minutes).catch((e) => ({ error: String(e) })),
      zabbixGetTrafficSeries(host, minutes).catch((e) => ({ error: String(e) })),
    ]);
    return NextResponse.json({ ok: true, host, minutes, temp, traf });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
