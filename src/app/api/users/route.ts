import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { login, password } = data as { login?: string; password?: string };

    if (!login || !password) {
      return NextResponse.json({ error: 'login e password são obrigatórios' }, { status: 400 });
    }

    // verificar duplicidade
    const exists = await prisma.user.findUnique({ where: { login } });
    if (exists) {
      return NextResponse.json({ error: 'login já cadastrado' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { login, password: hashed }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}
