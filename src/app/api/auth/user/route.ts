// src/app/api/auth/user/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('auth_token');

    if (!tokenCookie) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const token = tokenCookie.value;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET não está definida no ambiente.');
      return NextResponse.json({ error: 'Configuração de autenticação ausente.' }, { status: 500 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (err) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
    }

    const userId = payload?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, login: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Retorna dados essenciais do usuário (sem expor senha)
    return NextResponse.json({ ok: true, login: user.login, name: user.name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
