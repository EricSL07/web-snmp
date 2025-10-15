// src/app/api/switches/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const runtime = 'nodejs';

// FUNÇÃO POST: Para registrar um novo switch
export async function POST(request: Request) {
  try {
    const { hostname, ipAddress, group } = await request.json();
    if (!hostname || !ipAddress || !group) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }
    // If a switch with same hostname or ipAddress exists, return it (idempotent)
    const existing = await prisma.switch.findFirst({ where: { OR: [{ hostname }, { ipAddress }] } });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const newSwitch = await prisma.switch.create({
      data: { hostname, ipAddress, group },
    });
    return NextResponse.json(newSwitch, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar switch' }, { status: 500 });
  }
}

// FUNÇÃO GET: Para listar todos os switches
export async function GET() {
  try {
    const switches = await prisma.switch.findMany();
    return NextResponse.json(switches);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar switches' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
      // Accept JSON body with { hostname } or { ipAddress } or query params ?hostname=.../?ipAddress=...
      let hostname: string | null = null;
      let ipAddress: string | null = null;
      try {
        const body = await request.json();
        hostname = body?.hostname ?? null;
        ipAddress = body?.ipAddress ?? null;
      } catch (_e) {
        // ignore JSON parse errors
      }
      const url = new URL(request.url);
      hostname = hostname ?? url.searchParams.get('hostname');
      ipAddress = ipAddress ?? url.searchParams.get('ipAddress');

      if (!hostname && !ipAddress) {
        return NextResponse.json({ error: 'hostname or ipAddress is required to delete' }, { status: 400 });
      }

      const where: any = {};
      if (hostname && ipAddress) where.OR = [{ hostname }, { ipAddress }];
      else if (hostname) where.hostname = hostname;
      else if (ipAddress) where.ipAddress = ipAddress;

      const deleted = await prisma.switch.deleteMany({ where });
      return NextResponse.json({ deleted: deleted.count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao deletar switch' }, { status: 500 });
  }
}