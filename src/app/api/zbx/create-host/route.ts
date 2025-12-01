import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { zabbixEnsureHost, zabbixEnableSnmpForHost } from '@/lib/zabbix';
import path from 'path';
import { promises as fs } from 'fs';
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

    // Append host to Ansible inventory if IP is provided
    let inventoryWarning: string | undefined;
    try {
      if (ip) {
        const inventoryPath = path.join(process.cwd(), 'ansible', 'inventories', 'dev', 'hosts.ini');
        const hostname = String(host).trim();
        const ipAddr = String(ip).trim();

        // Ensure file exists; if not, initialize with [SWITCH] header
        let content: string;
        try {
          content = await fs.readFile(inventoryPath, 'utf-8');
        } catch (e: any) {
          if (e && e.code === 'ENOENT') {
            content = '[SWITCH]\n';
            await fs.mkdir(path.dirname(inventoryPath), { recursive: true });
            await fs.writeFile(inventoryPath, content, 'utf-8');
          } else {
            throw e;
          }
        }

        // Avoid duplicates by hostname or IP
        const lines = content.split(/\r?\n/);
        const hasHost = lines.some((l) => l.trim().startsWith('#') ? false : new RegExp(`^${hostname}(\s|\t)`).test(l.trim()));
        const hasIp = lines.some((l) => l.includes(`ansible_host=${ipAddr}`));
        if (!hasHost && !hasIp) {
          const newLine = `${hostname} ansible_host=${ipAddr}`;

          // Insert inside [SWITCH] group if present; else append header + line
          const idxSwitch = lines.findIndex((l) => l.trim() === '[SWITCH]');
          if (idxSwitch >= 0) {
            // Find next group header after [SWITCH]
            let insertAt = lines.length; // default append at end
            for (let i = idxSwitch + 1; i < lines.length; i++) {
              const tl = lines[i].trim();
              if (tl.startsWith('[') && tl.endsWith(']')) { insertAt = i; break; }
            }
            // Ensure there's a blank line before next group for readability
            const toInsert = [newLine];
            if (insertAt < lines.length && lines[insertAt - 1]?.trim() !== '') {
              toInsert.unshift('');
            }
            const updated = [...lines.slice(0, insertAt), ...toInsert, ...lines.slice(insertAt)];
            await fs.writeFile(inventoryPath, updated.join('\n').replace(/\n+$/,'\n'), 'utf-8');
          } else {
            // No [SWITCH] section; create it
            const updated = `${content.replace(/\n+$/,'\n')}[SWITCH]\n${newLine}\n`;
            await fs.writeFile(inventoryPath, updated, 'utf-8');
          }
        } else {
          inventoryWarning = 'Host já presente no hosts.ini (nome ou IP)';
        }
      } else {
        inventoryWarning = 'IP ausente; não foi possível atualizar hosts.ini';
      }
    } catch (invErr: any) {
      console.error('Falha ao atualizar hosts.ini', invErr);
      inventoryWarning = 'Falha ao atualizar hosts.ini';
    }

    return NextResponse.json(
      inventoryWarning ? { hostid: created.hostid, warning: inventoryWarning } : { hostid: created.hostid },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: (error && error.message) || 'Failed to create host' }, { status: 500 });
  }
}
