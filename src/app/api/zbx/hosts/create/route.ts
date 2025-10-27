import { NextResponse } from "next/server";
import { zabbixEnsureHost } from "@/lib/zabbix";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const hosts = Array.isArray(body) ? body : [body];
    const results: any[] = [];
    for (const h of hosts) {
      const r = await zabbixEnsureHost({
        host: h.host,
        name: h.name || h.host,
        dns: h.dns,
        ip: h.ip,
        groups: h.groups,
        templateNames: h.templates,
      });
      results.push(r);
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
