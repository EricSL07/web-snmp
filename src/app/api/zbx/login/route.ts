import { NextResponse } from "next/server";
import { zabbixLogin } from "@/lib/zabbix";

export async function GET() {
  try {
    const token = await zabbixLogin();
    return NextResponse.json({ ok: true, token });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
