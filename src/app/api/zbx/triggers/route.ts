import { NextResponse } from "next/server";
import { zabbixGetHostTriggers } from "@/lib/zabbix";

// GET /api/zbx/triggers?host=<hostOrId>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") || searchParams.get("hostid") || "";
  if (!host) return NextResponse.json({ ok: false, error: "No host specified" }, { status: 400 });
  try {
    const triggers = await zabbixGetHostTriggers(host);
    return NextResponse.json({ ok: true, host, triggers });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
