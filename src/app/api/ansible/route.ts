import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const ansibleApi = process.env.ANSIBLE_API_URL || 'http://localhost:5000';

export async function POST(req: Request) {
  const body = await req.json();

  // If a credentialId is present, resolve it and merge into extra_vars
  try {
    if (body.credentialId) {
      const p: any = prisma as any;
      const cred = await p.credential.findUnique({ where: { id: body.credentialId } });
      if (cred) {
        body.extra_vars = body.extra_vars || {};
        // Prefer Ansible vars used in inventory: ansible_user, ansible_password
        if (cred.username && body.extra_vars.ansible_user === undefined) body.extra_vars.ansible_user = cred.username;
        if (cred.password && body.extra_vars.ansible_password === undefined) body.extra_vars.ansible_password = cred.password;
        // Backward-compatible aliases if playbooks expect them
        if (cred.username && body.extra_vars.username === undefined) body.extra_vars.username = cred.username;
        if (cred.password && body.extra_vars.password === undefined) body.extra_vars.password = cred.password;
      }
    }
  } catch (e: any) {
    // log and continue without credential injection
    // eslint-disable-next-line no-console
    console.error('Error resolving credential:', e);
  }

  const r = await fetch(`${ansibleApi}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'ansible', 'playbooks');
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const playbooks = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
      .sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ playbooks });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Erro listando playbooks:', e);
    return NextResponse.json({ playbooks: [], error: 'Não foi possível listar playbooks' }, { status: 500 });
  }
}
