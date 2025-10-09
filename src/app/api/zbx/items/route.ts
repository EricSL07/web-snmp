import { NextResponse } from "next/server";
import { zabbixResolveHostId, zabbixGetItems } from "@/lib/zabbix";

// GET /api/zbx/items?host=SWITCH-CISCO&search=temp
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const host = searchParams.get("host") || "SWITCH-CISCO";
    const search = searchParams.get("search") || "";
    const hostid = await zabbixResolveHostId(host);
    const items = await zabbixGetItems(hostid, search ? { searchKey: search } : undefined);
    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
