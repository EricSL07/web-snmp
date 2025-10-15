import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET() {
  try {
    // prisma types may not be generated in the editor environment; cast to any to avoid TS errors
    const p: any = prisma as any;
    const creds = await p.credential.findMany({ select: { id: true, name: true, username: true, type: true } });
    return NextResponse.json(creds);
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, secret, type } = body || {};
    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const p: any = prisma as any;
    // If a credential with the same name already exists, return it (idempotent)
    const existing = await p.credential.findFirst({ where: { name } });
    if (existing) {
      return NextResponse.json({ id: existing.id, name: existing.name }, { status: 200 });
    }

    const created = await p.credential.create({ data: { name, username: username ?? null, secret: secret ?? null, type: type ?? null } });
    return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
  } catch (e: any) {
    console.error('Error creating credential:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Accept JSON body with { name } or query param ?name=...
    let name: string | null = null;
    try {
      const body = await request.json();
      name = body?.name ?? null;
    } catch (_e) {
      // ignore JSON parse errors
    }

    if (!name) {
      const url = new URL(request.url);
      name = url.searchParams.get('name');
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required to delete' }, { status: 400 });
    }

    const p: any = prisma as any;
    const deleted = await p.credential.deleteMany({ where: { name } });
    return NextResponse.json({ deleted: deleted.count });
  } catch (e: any) {
    console.error('Error deleting credential:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
