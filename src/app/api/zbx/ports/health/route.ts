import { NextResponse } from "next/server";
import { zabbixResolveHostId, zabbixGetItems } from "@/lib/zabbix";

// GET /api/zbx/ports/health?host=<host|hostid>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") || searchParams.get("hostid") || "";
  if (!host) return NextResponse.json({ ok: false, error: "No host specified" }, { status: 400 });
  try {
    const hostid = await zabbixResolveHostId(host);
    const items = await zabbixGetItems(hostid, { keyPrefix: "net.if." });
    const inItems = items.filter((it) => it.key_.startsWith("net.if.in["));
    const outItems = items.filter((it) => it.key_.startsWith("net.if.out["));
    const statusItems = items.filter((it) => it.key_.startsWith("net.if.status["));
    const speedItems = items.filter((it) => it.key_.startsWith("net.if.speed["));
    const errorsItems = items.filter((it) => it.key_.startsWith("net.if.in.errors[") || it.key_.startsWith("net.if.out.errors["));
    const discardsItems = items.filter((it) => it.key_.startsWith("net.if.in.discards[") || it.key_.startsWith("net.if.out.discards["));

    const summary = {
      hostid,
      counts: {
        in: inItems.length,
        out: outItems.length,
        status: statusItems.length,
        speed: speedItems.length,
        errors: errorsItems.length,
        discards: discardsItems.length,
        totalNetIf: items.length,
      },
    };

    const ok = inItems.length > 0 && outItems.length > 0 && statusItems.length > 0;
    return NextResponse.json({ ok, summary });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
