import { NextResponse } from "next/server";
import { zabbixGetPortsSummary } from "@/lib/zabbix";

// GET /api/zbx/ports?host=SWITCH-CISCO&limit=10
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") || searchParams.get("hostid");
  const limit = Number(searchParams.get("limit") || 10);
  if (!host) return NextResponse.json({ ok: false, error: 'Missing host/hostid' }, { status: 400 });
  try {
    const ports = await zabbixGetPortsSummary(host, limit);
    return NextResponse.json({ ok: true, ports });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
