import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(process.env.ZABBIX_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json-rpc" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "apiinfo.version",
        params: {},
        id: 1
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, version: data.result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
