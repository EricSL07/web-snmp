// src/app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    // 1. Encontrar o usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { login },
    });

    if (!user) {
      return NextResponse.json({ error: 'Login ou senha inválidos.' }, { status: 401 });
    }

    // 2. Comparar a senha fornecida com a senha hashada no banco
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Login ou senha inválidos.' }, { status: 401 });
    }

    // 3. Gerar o Token (JWT)
    const token = jwt.sign(
      { userId: user.id, login: user.login },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' } // Token expira em 1 dia
    );

    // 4. Armazenar o token em um cookie seguro
    cookies().set('auth_token', token, {
      httpOnly: true, // O cookie não pode ser acessado via JavaScript no frontend
      secure: process.env.NODE_ENV === 'production', // Use https em produção
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 dia em segundos
      path: '/',
    });

    return NextResponse.json({ message: 'Login bem-sucedido!' });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}