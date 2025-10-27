import { NextResponse } from "next/server";
import { zabbixGetHostDetails, zabbixGetHostUptime, zabbixGetHosts } from "@/lib/zabbix";

// GET /api/zbx/host?hostid=10766 or ?host=SWITCH-CISCO
// If called with ?host=all or without host parameter, return all hosts from Zabbix
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hostParam = searchParams.get("hostid") || searchParams.get("host");

  try {
    // If no specific host requested or explicit 'all', return all hosts
    if (!hostParam || hostParam.toLowerCase() === "all") {
      const hosts = await zabbixGetHosts();
      if (!hosts || hosts.length === 0) {
        return NextResponse.json({ ok: false, error: "Nenhum switch encontrado no Zabbix" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, hosts });
    }

    // Otherwise, resolve and return details for the specific host
    const host = await zabbixGetHostDetails(hostParam);
    if (!host) {
      return NextResponse.json({ ok: false, error: `Host não encontrado: ${hostParam}` }, { status: 404 });
    }
    const uptime = await zabbixGetHostUptime(hostParam).catch(() => null);
    return NextResponse.json({ ok: true, host, uptime });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
