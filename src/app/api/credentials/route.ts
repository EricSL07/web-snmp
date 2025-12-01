import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';

export async function GET() {
  try {
    // prisma types may not be generated in the editor environment; cast to any to avoid TS errors
    const p: any = prisma as any;
    const creds = await p.credential.findMany({ select: { id: true, username: true } });
    return NextResponse.json(creds);
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const p: any = prisma as any;
    // Idempotent: if same username/password exists, return it
    const existing = await p.credential.findFirst({ where: { username, password } });
    if (existing) {
      return NextResponse.json({ id: existing.id, username: existing.username }, { status: 200 });
    }

    const created = await p.credential.create({ data: { username, password } });
    return NextResponse.json({ id: created.id, username: created.username }, { status: 201 });
  } catch (e: any) {
    console.error('Error creating credential:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Accept JSON body with { id } or { username }, or query param ?id=... / ?username=...
    let id: string | null = null;
    let username: string | null = null;
    try {
      const body = await request.json();
      id = body?.id ?? null;
      username = body?.username ?? null;
    } catch (_e) {
      // ignore JSON parse errors
    }

    if (!id && !username) {
      const url = new URL(request.url);
      id = url.searchParams.get('id');
      username = url.searchParams.get('username');
    }

    if (!id && !username) {
      return NextResponse.json({ error: 'id ou username é obrigatório para excluir' }, { status: 400 });
    }

    const p: any = prisma as any;
    const where = id ? { id } : { username };
    const deleted = await p.credential.deleteMany({ where });
    return NextResponse.json({ deleted: deleted.count });
  } catch (e: any) {
    console.error('Error deleting credential:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
