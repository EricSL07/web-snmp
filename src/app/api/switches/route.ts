// src/app/api/switches/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// FUNÇÃO POST: Para registrar um novo switch
export async function POST(request: Request) {
  try {
    const { hostname, ipAddress, group } = await request.json();
    if (!hostname || !ipAddress || !group) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
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