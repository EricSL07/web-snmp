// src/app/api/switches/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const switchData = await prisma.switch.findUnique({
      where: { id: params.id },
    });

    if (!switchData) {
      return NextResponse.json({ error: 'Switch não encontrado' }, { status: 404 });
    }

    return NextResponse.json(switchData);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar switch' }, { status: 500 });
  }
}