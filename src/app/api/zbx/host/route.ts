import { NextResponse } from "next/server";
import { zabbixGetHostDetails, zabbixGetHostUptime } from "@/lib/zabbix";

// GET /api/zbx/host?hostid=10766 or ?host=SWITCH-CISCO
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hostid = searchParams.get("hostid") || searchParams.get("host") || "";
  if (!hostid) return NextResponse.json({ ok: false, error: "Missing hostid/host" }, { status: 400 });
  try {
    const host = await zabbixGetHostDetails(hostid);
    const uptime = await zabbixGetHostUptime(hostid).catch(() => null);
    return NextResponse.json({ ok: true, host, uptime });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
