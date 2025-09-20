// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json({ error: 'Login e senha são obrigatórios.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { login },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já existe.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        login,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: 'Usuário criado com sucesso!', userId: newUser.id }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}