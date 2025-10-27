import { NextResponse } from "next/server";
import { zabbixResolveHostId, zabbixGetItems, zabbixGetHosts } from "@/lib/zabbix";

// GET /api/zbx/items?host=SWITCH-CISCO&search=temp
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let host = searchParams.get("host") || "";
    const search = searchParams.get("search") || "";

    // If no host provided, fallback to first host from Zabbix
    if (!host) {
      const hosts = await zabbixGetHosts();
      if (Array.isArray(hosts) && hosts.length) host = hosts[0].host;
    }

    if (!host) return NextResponse.json({ ok: false, error: "No host specified" }, { status: 400 });

    const hostid = await zabbixResolveHostId(host);
    const items = await zabbixGetItems(hostid, search ? { searchKey: search } : undefined);
    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
