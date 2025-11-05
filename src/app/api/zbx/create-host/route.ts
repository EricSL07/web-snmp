import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { zabbixEnsureHost, zabbixEnableSnmpForHost } from '@/lib/zabbix';
export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request: Request) {
  try {
    // Auth: require auth_token JWT cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
    const jwtSecret = process.env.JWT_SECRET;
    if (!token || !jwtSecret) return unauthorized();
    try {
      jwt.verify(token, jwtSecret);
    } catch (err) {
      return unauthorized();
    }

    const body = await request.json();
    const { host, name, ip, groups, enableSnmp, community } = body || {};
    if (!host) return NextResponse.json({ error: 'host is required' }, { status: 400 });

    // Create host in Zabbix (idempotent by host name)
    const created = await zabbixEnsureHost({ host, name, ip, groups });

    if (enableSnmp) {
      try {
        await zabbixEnableSnmpForHost(created.hostid, { ip, dns: ip ? undefined : host, community });
      } catch (snmpErr) {
        // If SNMP enable failed, still return success for host creation but include warning
        console.error('Failed to enable SNMP for host', snmpErr);
        return NextResponse.json({ hostid: created.hostid, warning: String(snmpErr) }, { status: 201 });
      }
    }

    return NextResponse.json({ hostid: created.hostid }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: (error && error.message) || 'Failed to create host' }, { status: 500 });
  }
}
