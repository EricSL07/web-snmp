import { NextResponse } from "next/server";
import { zabbixEnableSnmpForHost } from "@/lib/zabbix";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const hosts = Array.isArray(body) ? body : [body];
    const out: any[] = [];
    for (const h of hosts) {
      const r = await zabbixEnableSnmpForHost(h.host || h.hostid, {
        ip: h.ip,
        dns: h.dns,
        community: h.community || "public",
        templateCandidates: Array.isArray(h.templates) ? h.templates : undefined,
      });
      out.push(r);
    }
    return NextResponse.json({ ok: true, results: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
