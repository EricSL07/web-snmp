import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

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
        // Merge credential fields into extra_vars only if they don't already exist
        if (cred.username && body.extra_vars.username === undefined) body.extra_vars.username = cred.username;
        if (cred.secret && body.extra_vars.password === undefined && body.extra_vars.secret === undefined) {
          // prefer to expose as 'password' but keep 'secret' if caller expects it
          body.extra_vars.password = cred.secret;
        }
        if (cred.type && body.extra_vars.credential_type === undefined) body.extra_vars.credential_type = cred.type;
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
