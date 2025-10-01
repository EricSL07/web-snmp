import { NextResponse } from "next/server";
import { zabbixGetHosts } from "@/lib/zabbix";

export async function GET() {
  try {
    const hosts = await zabbixGetHosts();
    return NextResponse.json({ ok: true, hosts });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
