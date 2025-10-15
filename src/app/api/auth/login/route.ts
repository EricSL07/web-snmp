// src/app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();
    // Validação básica da requisição
    if (!login || !password || typeof login !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

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

    // 3. Verificar se a secret do JWT está configurada
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET não está definida no ambiente.');
      return NextResponse.json({ error: 'Configuração de autenticação ausente.' }, { status: 500 });
    }

    // 4. Gerar o Token (JWT)
    const token = jwt.sign(
      { userId: user.id, login: user.login },
      jwtSecret,
      { expiresIn: '1d' } // Token expira em 1 dia
    );

    // 5. Armazenar o token em um cookie seguro usando NextResponse
    const response = NextResponse.json({ message: 'Login bem-sucedido!' });
    // Usar a API de cookies do NextResponse (objeto) para garantir compatibilidade
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 dia em segundos
      path: '/',
    });

    return response;

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}