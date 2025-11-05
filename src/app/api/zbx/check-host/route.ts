import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { zabbixHostExists } from "@/lib/zabbix";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const jwtSecret = process.env.JWT_SECRET;
    if (!token || !jwtSecret) return unauthorized();
    try {
      jwt.verify(token, jwtSecret);
    } catch (err) {
      return unauthorized();
    }

    const url = new URL(req.url);
    const host = url.searchParams.get("host") || "";
    if (!host)
      return NextResponse.json(
        { error: "host param is required" },
        { status: 400 }
      );

    const res = await zabbixHostExists(host);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: (error && error.message) || "Failed to check host" },
      { status: 500 }
    );
  }
}
