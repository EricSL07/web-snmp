import { NextResponse } from "next/server";
import { zabbixGetTrafficSeries } from "@/lib/zabbix";

// GET /api/zbx/metrics/traffic?host=SWITCH-CISCO&minutes=60
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") || "SWITCH-CISCO";
  const minutes = Number(searchParams.get("minutes") || 60);
  try {
    const traf = await zabbixGetTrafficSeries(host, minutes);
    return NextResponse.json({ ok: true, host, minutes, traf });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
