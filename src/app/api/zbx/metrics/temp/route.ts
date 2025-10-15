import { NextResponse } from "next/server";
import { zabbixGetTemperatureSeries } from "@/lib/zabbix";

// GET /api/zbx/metrics/temp?host=SWITCH-CISCO&minutes=60
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") || "SWITCH-CISCO";
  const minutes = Number(searchParams.get("minutes") || 60);
  try {
    const temp = await zabbixGetTemperatureSeries(host, minutes);
    return NextResponse.json({ ok: true, host, minutes, temp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
