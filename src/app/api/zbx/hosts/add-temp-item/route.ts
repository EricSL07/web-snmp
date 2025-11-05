import { NextResponse } from "next/server";
import { zabbixLogin } from "@/lib/zabbix";

const env = {
  ZABBIX_URL: (globalThis as any).process?.env?.ZABBIX_URL as string,
};

async function zbxRpc(method: string, params: any, token: string, id = 1) {
  const res = await fetch(env.ZABBIX_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
  });
  const data = await res.json();
  if (data.error)
    throw new Error(`[${method}] ${data.error.message}: ${data.error.data}`);
  return data.result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const host = body.host as string;
    const key = body.key || "custom.temp";
    const oid = body.oid || "1.3.6.1.4.1.8072.9999.1.1"; // our sim OID
    if (!host)
      return NextResponse.json(
        { ok: false, error: "Missing host" },
        { status: 400 }
      );
    const token = await zabbixLogin();
    // Resolve hostid
    const hosts = await zbxRpc(
      "host.get",
      { filter: { host: [host] }, output: ["hostid", "host"] },
      token,
      2
    );
    if (!hosts?.length) throw new Error(`Host not found: ${host}`);
    const hostid = hosts[0].hostid;
    // Create item; for Zabbix 7, use interfaceid=0 to auto-select default interface for the item type
    const item = await zbxRpc(
      "item.create",
      {
        hostid,
        interfaceid: 0,
        name: "Simulated temperature",
        key_: `snmp[${oid}]`,
        type: 5, // SNMP agent (Zabbix 7)
        value_type: 0, // float
        units: "C",
        description: "Temp from sim-switch pass_persist",
        delay: "30s",
        preprocessing: [],
        // snmp_oid is not required when key_ uses snmp[OID] format
      },
      token,
      4
    );
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
