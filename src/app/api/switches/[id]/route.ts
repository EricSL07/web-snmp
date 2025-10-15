// src/app/api/switches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const switchData = await prisma.switch.findUnique({
      where: { id },
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